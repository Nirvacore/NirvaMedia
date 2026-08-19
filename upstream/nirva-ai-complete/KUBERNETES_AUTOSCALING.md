# Phase 16: Kubernetes & Auto-Scaling

## Overview

This phase implements containerized deployment on Amazon EKS (Elastic Kubernetes Service) with comprehensive auto-scaling strategies, Helm charts for infrastructure-as-code, and production-grade Kubernetes configurations optimized for cost and performance.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              EKS Cluster (us-east-1)                   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │           Control Plane (AWS Managed)           │  │
│  │ - API Server, etcd, Scheduler, Controller Mgr   │  │
│  └─────────────────────────────────────────────────┘  │
│                      │                                  │
│  ┌──────────────────┴──────────────────────────────┐  │
│  │           Worker Node Groups                     │  │
│  │                                                  │  │
│  │  ┌──────────────┐  ┌──────────────┐             │  │
│  │  │ API Pods (3) │  │ Cache Pods   │             │  │
│  │  │ (t3.medium)  │  │ (r6i.large)  │             │  │
│  │  └──────────────┘  └──────────────┘             │  │
│  │                                                  │  │
│  │  ┌──────────────┐  ┌──────────────┐             │  │
│  │  │ Workers (2+) │  │ GPU Pods (1) │             │  │
│  │  │ (t3.large)   │  │ (g4dn.12x)   │             │  │
│  │  └──────────────┘  └──────────────┘             │  │
│  │                                                  │  │
│  │  ┌──────────────────────────────────────────┐  │  │
│  │  │ System Pods (kube-system)                │  │  │
│  │  │ - Calico networking                     │  │  │
│  │  │ - CoreDNS for service discovery         │  │  │
│  │  │ - Kube-proxy                            │  │  │
│  │  │ - Metrics-server for HPA                │  │  │
│  │  └──────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────┘  │
│                      │                                  │
├──────────────────────┼──────────────────────────────┤  │
│                      │                                  │
│  ┌──────────────────▼──────────────────────────┐  │   │
│  │    Kubernetes Services & Ingress            │  │   │
│  │ - Load Balancer (NLB/ALB)                  │  │   │
│  │ - API Gateway                             │  │   │
│  │ - Internal Services                       │  │   │
│  └──────────────────┬──────────────────────────┘  │   │
│                     │                               │   │
└─────────────────────┼───────────────────────────────┘   │
                      │
            ┌─────────┴─────────┐
            │                   │
      ┌─────▼──────┐      ┌────▼──────┐
      │ CloudFront │      │ Route 53   │
      │   (CDN)    │      │   (DNS)    │
      └────────────┘      └────────────┘
```

## 1. EKS Cluster Setup

### Cluster Configuration

```yaml
# EKS Cluster Definition
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig
metadata:
  name: nmd-production
  region: us-east-1
  version: "1.28"

# VPC Configuration
vpc:
  subnets:
    public:
      us-east-1a:
        id: subnet-12345
        cidr: 10.0.1.0/24
      us-east-1b:
        id: subnet-67890
        cidr: 10.0.2.0/24
      us-east-1c:
        id: subnet-abcde
        cidr: 10.0.3.0/24
    private:
      us-east-1a:
        id: subnet-fghij
        cidr: 10.0.101.0/24
      us-east-1b:
        id: subnet-klmno
        cidr: 10.0.102.0/24
      us-east-1c:
        id: subnet-pqrst
        cidr: 10.0.103.0/24

# IRSA (IAM Roles for Service Accounts)
iam:
  withOIDC: true
  serviceAccounts:
    # API Service Account
    - metadata:
        name: nmd-api
        namespace: default
      attachPolicy:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Action:
              - "s3:GetObject"
              - "s3:PutObject"
              - "s3:ListBucket"
            Resource:
              - "arn:aws:s3:::nmd-platform/*"
          - Effect: Allow
            Action:
              - "ssm:GetParameter"
              - "ssm:GetParameters"
            Resource:
              - "arn:aws:ssm:us-east-1:123456789:parameter/nmd/*"
          - Effect: Allow
            Action:
              - "secrets-manager:GetSecretValue"
            Resource:
              - "arn:aws:secretsmanager:us-east-1:123456789:secret:nmd/*"

    # Cluster Autoscaler Service Account
    - metadata:
        name: cluster-autoscaler
        namespace: kube-system
      attachPolicyARNs:
        - arn:aws:iam::aws:policy/AutoScalingFullAccess

# Node Groups
nodeGroups:
  # API Tier
  api-tier:
    name: api-tier
    desiredCapacity: 3
    minSize: 3
    maxSize: 10
    instanceType:
      - t3.medium
      - t3.large
    spot: false
    labels:
      workload: api
      tier: application
    taints:
      - key: workload
        value: api
        effect: NoSchedule

  # Worker Tier (general purpose)
  worker-tier:
    name: worker-tier
    desiredCapacity: 2
    minSize: 2
    maxSize: 20
    instanceType:
      - t3.large
      - t3.xlarge
    spot: true
    spotPrice: "0.50"
    labels:
      workload: worker
      tier: compute
    taints: []

  # Cache Tier
  cache-tier:
    name: cache-tier
    desiredCapacity: 2
    minSize: 2
    maxSize: 4
    instanceType:
      - r6i.large
      - r6i.xlarge
    spot: false
    labels:
      workload: cache
      tier: memory
    taints:
      - key: workload
        value: cache
        effect: NoSchedule

  # ML/GPU Tier
  gpu-tier:
    name: gpu-tier
    desiredCapacity: 1
    minSize: 0
    maxSize: 3
    instanceType:
      - g4dn.12xlarge
    spot: true
    labels:
      workload: gpu
      tier: ml
      gpu: nvidia
    taints:
      - key: workload
        value: gpu
        effect: NoSchedule

# Add-ons
addons:
  - name: vpc-cni
    version: latest
    attachPolicyARNs:
      - arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy
  - name: kube-proxy
    version: latest
  - name: coredns
    version: latest
  - name: ebs-csi-driver
    version: latest
  - name: efs-csi-driver
    version: latest
```

### Cluster Security Configuration

```yaml
# Network Security
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: default
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: default
        - podSelector:
            matchLabels:
              role: frontend
      ports:
        - protocol: TCP
          port: 8080

---
# Pod Security Policy
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: restricted
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  hostNetwork: false
  hostIPC: false
  hostPID: false
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'MustRunAs'
  fsGroup:
    rule: 'MustRunAs'
  readOnlyRootFilesystem: false

---
# RBAC Configuration
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: nmd-api-role
rules:
  - apiGroups: [""]
    resources: ["configmaps", "secrets"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["services"]
    verbs: ["get", "list"]
  - apiGroups: ["batch"]
    resources: ["jobs"]
    verbs: ["get", "list", "create", "update"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: nmd-api-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: nmd-api-role
subjects:
  - kind: ServiceAccount
    name: nmd-api
    namespace: default
```

## 2. Helm Charts

### Main Application Helm Chart

```yaml
# Chart.yaml
apiVersion: v2
name: nmd-platform
description: NMD Platform Helm Chart
type: application
version: 1.0.0
appVersion: "1.0.0"
keywords:
  - nmd
  - platform
  - media
maintainers:
  - name: NirvaCore
    email: platform@nirvacore.com

---
# values.yaml - Default Values
replicaCount: 3

image:
  repository: 123456789.dkr.ecr.us-east-1.amazonaws.com/nmd-api
  pullPolicy: IfNotPresent
  tag: "1.0.0"

imagePullSecrets:
  - name: ecr-secret

# Service Account
serviceAccount:
  create: true
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789:role/nmd-api-role
  name: nmd-api

# Pod Security Context
podSecurityContext:
  runAsNonRoot: true
  runAsUser: 1000
  fsGroup: 1000

securityContext:
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities:
    drop:
      - ALL

# Service Configuration
service:
  type: ClusterIP
  port: 8080
  targetPort: 8080
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"

# Ingress Configuration
ingress:
  enabled: true
  className: "alb"
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}, {"HTTPS": 443}]'
    alb.ingress.kubernetes.io/ssl-redirect: '443'
    alb.ingress.kubernetes.io/certificate-arn: "arn:aws:acm:us-east-1:123456789:certificate/12345"
  hosts:
    - host: api.nmd.platform
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: nmd-tls
      hosts:
        - api.nmd.platform

# Resources
resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi

# Autoscaling (HPA)
autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 20
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

# Node Affinity
affinity:
  nodeAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      nodeSelectorTerms:
        - matchExpressions:
            - key: workload
              operator: In
              values:
                - api
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchExpressions:
              - key: app
                operator: In
                values:
                  - nmd-api
          topologyKey: kubernetes.io/hostname

# Pod Disruption Budget
podDisruptionBudget:
  enabled: true
  minAvailable: 2

# Liveness and Readiness Probes
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 2

# Environment Variables
env:
  - name: NODE_ENV
    value: "production"
  - name: LOG_LEVEL
    value: "info"
  - name: DB_HOST
    valueFrom:
      configMapKeyRef:
        name: nmd-config
        key: db.host
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: nmd-secrets
        key: db.password
  - name: REDIS_URL
    valueFrom:
      configMapKeyRef:
        name: nmd-config
        key: redis.url

# Volume Mounts
volumeMounts:
  - name: tmp
    mountPath: /tmp
  - name: cache
    mountPath: /app/cache
  - name: config
    mountPath: /app/config
    readOnly: true

# Volumes
volumes:
  - name: tmp
    emptyDir: {}
  - name: cache
    emptyDir: {}
  - name: config
    configMap:
      name: nmd-config

---
# templates/deployment.yaml (Helm template)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "nmd-platform.fullname" . }}
  labels:
    {{- include "nmd-platform.labels" . | nindent 4 }}
spec:
  {{- if not .Values.autoscaling.enabled }}
  replicas: {{ .Values.replicaCount }}
  {{- end }}
  selector:
    matchLabels:
      {{- include "nmd-platform.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "nmd-platform.selectorLabels" . | nindent 8 }}
    spec:
      {{- with .Values.imagePullSecrets }}
      imagePullSecrets:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      serviceAccountName: {{ include "nmd-platform.serviceAccountName" . }}
      securityContext:
        {{- toYaml .Values.podSecurityContext | nindent 8 }}
      containers:
        - name: {{ .Chart.Name }}
          securityContext:
            {{- toYaml .Values.securityContext | nindent 12 }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - name: http
              containerPort: 8080
              protocol: TCP
          livenessProbe:
            {{- toYaml .Values.livenessProbe | nindent 12 }}
          readinessProbe:
            {{- toYaml .Values.readinessProbe | nindent 12 }}
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
          env:
            {{- toYaml .Values.env | nindent 12 }}
          volumeMounts:
            {{- toYaml .Values.volumeMounts | nindent 12 }}
      {{- with .Values.volumes }}
      volumes:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.affinity }}
      affinity:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.podDisruptionBudget }}
      podDisruptionBudget:
        {{- toYaml . | nindent 8 }}
      {{- end }}
```

### Infrastructure Helm Chart (StatefulSets)

```yaml
# infra-helm-chart/values.yaml
redis:
  enabled: true
  replicas: 3
  image: redis:7.0-alpine
  persistence:
    size: 50Gi
    storageClass: gp2

postgresql:
  enabled: false # Use RDS instead
  replicas: 1
  persistence:
    size: 100Gi

elasticsearch:
  enabled: false # Optional for logging

prometheus:
  enabled: true
  storageSize: 50Gi
  retention: 15d

grafana:
  enabled: true
  adminPassword: changeme

---
# Redis StatefulSet
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
  namespace: default
spec:
  serviceName: redis
  replicas: 3
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchExpressions:
                  - key: app
                    operator: In
                    values:
                      - redis
              topologyKey: kubernetes.io/hostname
      containers:
        - name: redis
          image: redis:7.0-alpine
          ports:
            - containerPort: 6379
              name: redis
          command:
            - redis-server
            - /etc/redis/redis.conf
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: 1000m
              memory: 2Gi
          livenessProbe:
            exec:
              command:
                - redis-cli
                - ping
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            exec:
              command:
                - redis-cli
                - ping
            initialDelaySeconds: 10
            periodSeconds: 5
          volumeMounts:
            - name: redis-data
              mountPath: /data
            - name: redis-config
              mountPath: /etc/redis
  volumeClaimTemplates:
    - metadata:
        name: redis-data
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: gp2
        resources:
          requests:
            storage: 50Gi
```

## 3. Auto-Scaling Configuration

### Horizontal Pod Autoscaler (HPA)

```yaml
# HPA for API tier
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: nmd-api-hpa
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nmd-api
  minReplicas: 3
  maxReplicas: 20
  metrics:
    # CPU-based scaling
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    
    # Memory-based scaling
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
    
    # Custom metrics (requests per second)
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "1000"
  
  # Scaling behavior
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Percent
          value: 50
          periodSeconds: 60
        - type: Pods
          value: 5
          periodSeconds: 60
      selectPolicy: Max
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 25
          periodSeconds: 60
        - type: Pods
          value: 2
          periodSeconds: 60
      selectPolicy: Min

---
# HPA for Worker tier (burst workloads)
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: nmd-worker-hpa
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nmd-worker
  minReplicas: 2
  maxReplicas: 50
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
        - type: Percent
          value: 100
          periodSeconds: 30
      selectPolicy: Max
    scaleDown:
      stabilizationWindowSeconds: 600
      policies:
        - type: Percent
          value: 50
          periodSeconds: 60
      selectPolicy: Min
```

### Vertical Pod Autoscaler (VPA)

```yaml
# VPA for API tier (resource recommendations)
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: nmd-api-vpa
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nmd-api
  updatePolicy:
    updateMode: "Auto"  # Can be "Auto", "Recreate", "Initial", "Off"
  resourcePolicy:
    containerPolicies:
      - containerName: nmd-api
        minAllowed:
          cpu: 100m
          memory: 128Mi
        maxAllowed:
          cpu: 2000m
          memory: 2Gi
        controlledResources:
          - cpu
          - memory
        controlledValues: RequestsAndLimits

---
# VPA for Cache tier
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: redis-vpa
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: redis
  updatePolicy:
    updateMode: "Recreate"  # Recreate to maintain quorum
  resourcePolicy:
    containerPolicies:
      - containerName: redis
        minAllowed:
          cpu: 500m
          memory: 512Mi
        maxAllowed:
          cpu: 4000m
          memory: 8Gi
```

### Cluster Autoscaling

```yaml
# Cluster Autoscaler Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: cluster-autoscaler
  template:
    metadata:
      labels:
        app: cluster-autoscaler
    spec:
      serviceAccountName: cluster-autoscaler
      containers:
        - image: registry.k8s.io/autoscaling/cluster-autoscaler:v1.28.0
          name: cluster-autoscaler
          resources:
            limits:
              cpu: 100m
              memory: 600Mi
            requests:
              cpu: 50m
              memory: 300Mi
          command:
            - ./cluster-autoscaler
            - --cloud-provider=aws
            - --expander=least-waste
            - --node-group-auto-discovery=asg:tag:k8s.io/cluster-autoscaler/nmd-production,k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/node-template/label/workload
            - --scale-down-enabled=true
            - --scale-down-delay-after-add=10m
            - --scale-down-delay-after-failure=5m
            - --scale-down-unneeded-time=10m
            - --skip-nodes-with-local-storage=false
            - --skip-nodes-with-system-pods=true
            - --balance-similar-node-groups=true
            - --balancing-ignore-label=topology.kubernetes.io/zone
          env:
            - name: AWS_REGION
              value: "us-east-1"
          volumeMounts:
            - name: ssl-certs
              mountPath: /etc/ssl/certs/ca-certificates.crt
              readOnly: true
      volumes:
        - name: ssl-certs
          hostPath:
            path: /etc/ssl/certs/ca-bundle.crt
      nodeSelector:
        kubernetes.io/os: linux

---
# Cluster Autoscaler Configuration
# Auto-scaling Groups (ASG) for each node tier:
# - api-tier: min=3, max=10
# - worker-tier: min=2, max=20
# - cache-tier: min=2, max=4
# - gpu-tier: min=0, max=3
```

## 4. ConfigMaps and Secrets

### Configuration Management

```yaml
# ConfigMap for application configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: nmd-config
  namespace: default
data:
  app.yaml: |
    server:
      port: 8080
      timeout: 30s
      cors:
        allowedOrigins:
          - https://app.nmd.platform
          - https://admin.nmd.platform
        allowedMethods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
    
    database:
      host: nmd-db.c9akciq32.us-east-1.rds.amazonaws.com
      port: 5432
      name: nmd_prod
      maxConnections: 100
      idleTimeout: 300
      queryTimeout: 30
    
    redis:
      url: redis://redis-0.redis:6379,redis-1.redis:6379,redis-2.redis:6379
      password: ""
      ttl: 3600
    
    logging:
      level: info
      format: json
      outputs:
        - stdout
        - cloudwatch
    
    metrics:
      enabled: true
      port: 9090
      path: /metrics

---
# Secrets for sensitive data
apiVersion: v1
kind: Secret
metadata:
  name: nmd-secrets
  namespace: default
type: Opaque
stringData:
  database-password: "{{ .Values.secrets.dbPassword }}"
  jwt-secret: "{{ .Values.secrets.jwtSecret }}"
  api-key: "{{ .Values.secrets.apiKey }}"
  encryption-key: "{{ .Values.secrets.encryptionKey }}"

---
# Secret for Docker registry access
apiVersion: v1
kind: Secret
metadata:
  name: ecr-secret
  namespace: default
type: kubernetes.io/dockercfg
dockercfg: |
  {
    "123456789.dkr.ecr.us-east-1.amazonaws.com": {
      "auth": "{{ .Values.secrets.ecrAuth }}"
    }
  }
```

### External Secrets Operator (for dynamic updates)

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: external-secrets
  namespace: external-secrets-system

---
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets-store
  namespace: default
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets

---
# Synced secret from AWS Secrets Manager
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: nmd-secrets
  namespace: default
spec:
  refreshInterval: 24h
  secretStoreRef:
    name: aws-secrets-store
    kind: SecretStore
  target:
    name: nmd-secrets
    creationPolicy: Owner
  data:
    - secretKey: db-password
      remoteRef:
        key: nmd/prod/db-password
    - secretKey: jwt-secret
      remoteRef:
        key: nmd/prod/jwt-secret
    - secretKey: api-key
      remoteRef:
        key: nmd/prod/api-key
```

## 5. Production Deployment Checklist

### Pre-Deployment

- [ ] Helm charts created and tested locally
- [ ] Docker images built and pushed to ECR
- [ ] EKS cluster provisioned with all node groups
- [ ] Storage classes configured (gp2, io1, efs)
- [ ] Secrets created in AWS Secrets Manager
- [ ] IAM roles and service accounts configured
- [ ] Network policies configured
- [ ] Ingress controller installed (ALB)
- [ ] Metrics server installed (for HPA)
- [ ] Cluster autoscaler deployed
- [ ] Monitoring stack deployed (Prometheus/Grafana)

### Deployment

- [ ] Deploy infrastructure via Helm (Redis, databases, etc.)
- [ ] Deploy application via Helm
- [ ] Verify all pods are running and ready
- [ ] Test ingress routes
- [ ] Verify HPA metrics collection
- [ ] Verify cluster autoscaling works (scale up/down)
- [ ] Run smoke tests
- [ ] Verify logging and metrics collection
- [ ] Load test cluster
- [ ] Verify failover procedures

### Post-Deployment

- [ ] Monitor pod restart counts
- [ ] Verify autoscaling behavior under load
- [ ] Review resource utilization
- [ ] Validate backup/restore procedures
- [ ] Document runbooks
- [ ] Train operations team
- [ ] Schedule regular disaster recovery drills
- [ ] Implement cost monitoring

## 6. Monitoring and Observability

### Prometheus Rules

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: kubernetes-pod-alerts
  namespace: monitoring
spec:
  groups:
    - name: kubernetes.rules
      interval: 30s
      rules:
        # Pod CPU usage
        - alert: PodHighCPUUsage
          expr: |
            (sum(rate(container_cpu_usage_seconds_total[5m])) by (pod, namespace) / 
             sum(container_spec_cpu_quota) by (pod, namespace)) > 0.9
          for: 5m
          annotations:
            summary: "Pod {{ $labels.pod }} high CPU usage"
            description: "CPU usage is {{ $value | humanizePercentage }}"

        # Pod memory usage
        - alert: PodHighMemoryUsage
          expr: |
            (sum(container_memory_working_set_bytes) by (pod, namespace) / 
             sum(container_spec_memory_limit_bytes) by (pod, namespace)) > 0.9
          for: 5m
          annotations:
            summary: "Pod {{ $labels.pod }} high memory usage"

        # Pod restart rate
        - alert: PodHighRestartRate
          expr: |
            rate(kube_pod_container_status_restarts_total[1h]) > 0.05
          for: 5m
          annotations:
            summary: "Pod {{ $labels.pod }} restarting frequently"

        # HPA at max replicas
        - alert: HPAAtMaxReplicas
          expr: |
            kube_hpa_status_current_replicas >= kube_hpa_status_desired_replicas
          for: 10m
          annotations:
            summary: "HPA {{ $labels.horizontalpodautoscaler }} at max replicas"
            description: "Cannot scale further, may need to increase maxReplicas"

        # Node pressure (disk, memory)
        - alert: NodeDiskPressure
          expr: |
            kube_node_status_condition{condition="DiskPressure", status="true"} == 1
          for: 5m
          annotations:
            summary: "Node {{ $labels.node }} disk pressure detected"

        # Cluster autoscaler failures
        - alert: ClusterAutoscalerErrors
          expr: |
            rate(cluster_autoscaler_errors_total[5m]) > 0.1
          for: 10m
          annotations:
            summary: "Cluster autoscaler encountering errors"
```

## 7. Implementation Roadmap (4 Weeks)

### Week 1: EKS Setup & Configuration
- **Days 1-2**: Create EKS cluster with eksctl
- **Days 3-4**: Configure node groups (API, worker, cache, GPU)
- **Days 5-6**: Install add-ons and operators
- **Day 7**: Security hardening and RBAC

### Week 2: Helm Charts & Deployment
- **Days 1-2**: Create application Helm chart
- **Days 3-4**: Create infrastructure Helm chart
- **Days 5-6**: Deploy and verify
- **Day 7**: Test rolling updates

### Week 3: Auto-Scaling Configuration
- **Days 1-2**: Deploy and configure HPA
- **Days 3-4**: Deploy and configure VPA
- **Days 5-6**: Deploy cluster autoscaler
- **Day 7**: Load testing and tuning

### Week 4: Production Readiness
- **Days 1-2**: Monitoring stack setup
- **Days 3-4**: Alerting and runbooks
- **Days 5-6**: Disaster recovery drills
- **Day 7**: Go-live preparation

## 8. Cost Optimization

### Reserved Instances & Savings Plans
- Use reserved instances for baseline load (3 API pods, 2 cache pods): ~50% savings
- On-demand for burst capacity: Pay per usage
- Spot instances for non-critical workloads: ~70% savings

### Resource Requests/Limits
- API pods: Request 250m CPU/256Mi RAM, Limit 500m CPU/512Mi RAM
- Worker pods: Request 1 CPU/1Gi RAM, Limit 2 CPU/2Gi RAM
- Cache pods: Request 500m CPU/1Gi RAM, Limit 1 CPU/2Gi RAM

### Estimated Monthly Cost
- EKS cluster: $73 (control plane)
- Worker nodes (3 t3.medium + 2 t3.large + 2 r6i.large + 1 GPU): $2,500
- NAT gateways & data transfer: $500
- **Total**: ~$3,073/month (70% savings compared to unoptimized setup)

## Success Criteria

✅ Pod deployment time: <2 minutes
✅ Auto-scaling response time: <5 minutes
✅ Rolling updates with zero downtime
✅ 99.99% cluster availability
✅ <10% resource waste (good node utilization)
✅ All metrics collected and visible in dashboards
✅ Alerting working for critical events
✅ Disaster recovery procedures documented and tested
