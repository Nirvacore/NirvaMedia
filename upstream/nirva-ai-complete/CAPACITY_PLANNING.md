# CAPACITY_PLANNING.md

## Overview

This document provides guidance for capacity planning and scaling the NMD Platform to handle growth. It includes load forecasting, scaling thresholds, and procedures to ensure the system maintains performance as traffic increases.

**Current Capacity (2024-07-31):**
- Concurrent users: 5,000
- Requests per second: 1,200 req/s
- Monthly API calls: 3.1 billion
- Storage: 500 GB
- Database connections: 10 active
- Available headroom: 30-40%

**Growth Projections:**
- Optimistic: 50% growth/year (600 req/s per quarter)
- Realistic: 30% growth/year (360 req/s per quarter)
- Conservative: 10% growth/year (120 req/s per quarter)

---

## 1. Capacity Metrics & Monitoring

### 1.1 Key Performance Indicators (KPIs)

Monitor these metrics continuously:

```prometheus
# Request throughput (req/s)
rate(http_requests_total[1m])

# Response time (milliseconds)
histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m]))

# Database connection pool utilization
pg_stat_activity_count / max_connections * 100

# Redis memory usage (percentage)
redis_memory_used_bytes / redis_memory_max_bytes * 100

# Disk usage (percentage)
node_filesystem_avail_bytes / node_filesystem_size_bytes * 100

# CPU utilization (percentage)
rate(cpu_time[5m]) * 100

# Error rate (percentage)
rate(http_errors_total[5m]) / rate(http_requests_total[5m]) * 100

# Cache hit rate (percentage)
redis_hits / (redis_hits + redis_misses) * 100
```

### 1.2 Scaling Thresholds

| Metric | Yellow (Warning) | Red (Critical) | Action |
|--------|-----------------|----------------|--------|
| Request/s | 1,000 (83%) | 1,200 (100%) | Scale compute |
| Avg latency | 50ms | 100ms | Optimize queries |
| p95 latency | 100ms | 150ms | Add caching |
| p99 latency | 200ms | 300ms | Add indexes |
| DB conn pool | 16/20 (80%) | 19/20 (95%) | Increase pool size |
| Redis memory | 1.6GB/2GB (80%) | 1.9GB/2GB (95%) | Optimize/increase |
| Disk usage | 400GB/500GB (80%) | 450GB/500GB (90%) | Archive/expand |
| CPU usage | 75% | 85% | Add instances |
| Memory usage | 1.5GB/2GB (75%) | 1.8GB/2GB (90%) | Add instances |
| Error rate | 0.5% | 1% | Investigate issues |

### 1.3 Alert Configuration

```yaml
# In monitoring/alerts.yml
groups:
  - name: capacity_alerts
    rules:
      - alert: HighRequestRate
        expr: rate(http_requests_total[5m]) > 1000
        for: 5m
        annotations:
          summary: "Request rate {{ $value }} req/s (>1000)"
      
      - alert: HighDBConnPoolUsage
        expr: pg_stat_activity_count / 20 > 0.8
        for: 2m
        annotations:
          summary: "DB connections {{ $value }} / 20 (>80%)"
      
      - alert: HighRedisMemory
        expr: redis_memory_used_bytes / 2147483648 > 0.8
        for: 5m
        annotations:
          summary: "Redis memory {{ $value }}% (>80%)"
      
      - alert: DiskSpaceUsage
        expr: (node_filesystem_size_bytes - node_filesystem_avail_bytes) / node_filesystem_size_bytes > 0.8
        for: 10m
        annotations:
          summary: "Disk {{ $value }}% full (>80%)"
```

---

## 2. Compute Scaling

### 2.1 Horizontal Scaling (Add More Instances)

**When to Scale:**
- Request rate approaching 1,000 req/s
- CPU utilization >75%
- Average latency increasing
- Error rate increasing

**Scaling Process:**

**Option A: Manual Scaling**
```bash
# 1. Update docker-compose.yml
services:
  api:
    deploy:
      replicas: 4  # Increase from 3 to 4

# 2. Redeploy
docker-compose up -d api

# 3. Verify new instance joined
docker-compose ps api

# 4. Monitor metrics
watch -n 5 'curl -s http://localhost:9091/api/v1/query?query=rate(http_requests_total[1m]) | jq'
```

**Option B: Kubernetes with HPA (Recommended for >1,000 req/s)**
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 3  # Initial replicas
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
      - name: api
        image: nmd-api:latest
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 1Gi

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: 400  # Scale at 400 req/s per pod
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
      - type: Pods
        value: 2
        periodSeconds: 60
      selectPolicy: Max
```

**Cost Impact:** +$250/month per instance (2 CPU, 2GB RAM)

### 2.2 Vertical Scaling (Larger Instances)

**When to Use:** If you have few users with high resource needs (e.g., bulk processing)

**Options:**
```yaml
# Option 1: Medium instances (current)
cpus: 2
memory: 2G
cost: ~$85/month per instance

# Option 2: Large instances
cpus: 4
memory: 4G
cost: ~$170/month per instance

# Option 3: Extra Large
cpus: 8
memory: 8G
cost: ~$340/month per instance
```

**Recommendation:** Use horizontal scaling up to 10 instances, then vertical scaling for larger deployments.

---

## 3. Database Scaling

### 3.1 Connection Pool Scaling

**Current:** 20 maximum connections

**Scaling Process:**
```bash
# 1. Monitor connection usage
docker exec postgres psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# 2. If approaching 16/20, increase pool
# In .env:
DATABASE_POOL_MAX=30

# 3. Increase PostgreSQL max connections
# In postgresql.conf
max_connections = 100

# 4. Restart PostgreSQL
docker-compose restart postgres

# 5. Verify
docker exec postgres psql -U postgres -c "SHOW max_connections;"
```

**Thresholds:**
- 10-15 connections: Add indexes, optimize queries
- 16-20 connections: Increase DATABASE_POOL_MAX to 30
- >30 connections: Increase PostgreSQL max_connections and use PgBouncer
- >100 connections: Consider read replicas

### 3.2 Read Replicas (For Query-Heavy Workloads)

**When to Use:**
- Read-heavy workload (>80% reads, <20% writes)
- Query latency increasing
- Want to scale read capacity independent of write capacity

**Setup:**
```yaml
# docker-compose.yml
postgres-primary:
  image: postgres:16-alpine
  environment:
    POSTGRES_DB: nmd_platform
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
  volumes:
    - postgres_data_primary:/var/lib/postgresql/data
  command:
    - "postgres"
    - "-c"
    - "wal_level=replica"
    - "-c"
    - "max_wal_senders=3"
    - "-c"
    - "max_replication_slots=3"

postgres-replica-1:
  image: postgres:16-alpine
  depends_on:
    - postgres-primary
  environment:
    PGUSER: replicator
  volumes:
    - postgres_data_replica1:/var/lib/postgresql/data
  command:
    - bash
    - -c
    - |
      until pg_basebackup -h postgres-primary -D /var/lib/postgresql/data -U replicator -v -P -W; do
        echo "Waiting for primary to accept connections..."
        sleep 1s
      done &&
      echo "standby_mode = 'on'" >> /var/lib/postgresql/data/recovery.conf &&
      postgres
```

**Application Changes:**
```typescript
// Route writes to primary, reads to replicas
const primaryPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const replicaPool = new Pool({
  connectionString: process.env.DATABASE_REPLICA_URL,
});

// Write operation
async function updateContent(id, data) {
  return primaryPool.query('UPDATE content SET ... WHERE id = $1', [id]);
}

// Read operation
async function getContent(id) {
  return replicaPool.query('SELECT * FROM content WHERE id = $1', [id]);
}
```

**Cost Impact:** +$150-300/month per replica

### 3.3 Database Partitioning

**When to Use:** Table >1GB with uneven access patterns

**Example:**
```sql
-- Partition content table by organization
CREATE TABLE IF NOT EXISTS content_1 PARTITION OF content
FOR VALUES FROM (1) TO (100);

CREATE TABLE IF NOT EXISTS content_100 PARTITION OF content
FOR VALUES FROM (100) TO (200);

-- Partitioning improves:
-- - Query performance: Only scans relevant partition
-- - Index size: Smaller indexes per partition
-- - Maintenance: Faster vacuum, cleanup per partition
```

---

## 4. Cache Scaling

### 4.1 Redis Cluster (For Cache >2GB)

**When to Use:**
- Cache size >2GB
- Need multiple cache nodes for redundancy
- Want to scale cache independently

**Setup:**
```yaml
# docker-compose.yml
redis-cluster:
  image: redis:7-alpine
  command: redis-server --cluster-enabled yes
  ports:
    - "7001-7006:7001-7006"
  volumes:
    - redis_cluster_1:/data
    - redis_cluster_2:/data
    - redis_cluster_3:/data
```

**Application Changes:**
```typescript
// Use redis-cluster client
import Redis from 'ioredis';

const cluster = new Redis.Cluster([
  { host: 'localhost', port: 7001 },
  { host: 'localhost', port: 7002 },
  { host: 'localhost', port: 7003 },
]);

await cluster.set('key', 'value');
const value = await cluster.get('key');
```

**Cost Impact:** +$150-200/month for 3-node cluster

### 4.2 Redis Memory Expansion

**Current:** 2GB

**Growth Path:**
- 2GB → 4GB (current: est. Year 1)
- 4GB → 8GB (est. Year 2)
- 8GB → 16GB (est. Year 3)

**Cost:** ~$30/month per 2GB

---

## 5. Storage Scaling

### 5.1 Database Storage Growth

**Current:** 500 GB
**Growth Rate:** ~100 GB/month

**Projections:**
- 3 months: 800 GB
- 6 months: 1.1 TB
- 1 year: 1.7 TB

**Expansion Strategy:**
```bash
# AWS: Increase EBS volume
aws ec2 modify-volume --volume-id vol-xxx --size 1000

# Docker: Increase mounted volume
docker volume create --opt type=nfs -o addr=nfs-server,vers=4,soft --opt o=addr=nfs-server nmd_large

# PostgreSQL: Extend tablespace
ALTER TABLESPACE ts_large OWNER TO postgres;
ALTER TABLE content SET TABLESPACE ts_large;
```

### 5.2 Backup Storage Growth

**Current:** 30-day retention, compression 10:1
**Storage:** 30 × (500 MB backup / 10 compression) = 1.5 TB

**Scaling:**
- Year 1: 2.5 TB
- Year 2: 3.5 TB
- Year 3: 4.5 TB

**Cost:** ~$50-100/month at scale with tiering

---

## 6. Network Scaling

### 6.1 Load Balancer Configuration

**Current Setup:**
```
Client → Single Load Balancer → 3 API Instances
```

**Growth Setup (>5,000 req/s):**
```
Client → Global Load Balancer → Regional Load Balancers → 10+ API Instances
         (Route 53)                (ALB in each region)
```

**Multi-region Setup:**
```yaml
# Use AWS Route 53 for global routing
primary_region: us-east-1
secondary_region: us-west-2

route_policy: failover
health_check_interval: 30s
failover_threshold: 2 failures
```

### 6.2 CDN for Static Assets

**Implement CloudFront:**
```bash
# 1. Create CloudFront distribution
aws cloudfront create-distribution \
  --origin-domain-name nmd-uploads.s3.amazonaws.com \
  --cache-behaviors=[
    {
      PathPattern: "*.js",
      Compress: true,
      TrustedSigners: {Enabled: false, Items: []},
      ViewerProtocolPolicy: "redirect-to-https",
      CachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6"  # Managed-CachingOptimized
    },
    {
      PathPattern: "*.css",
      Compress: true,
      ViewerProtocolPolicy: "redirect-to-https",
      CachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6"
    }
  ]

# 2. Update DNS
# api.nmd.platform → CloudFront distribution domain

# Benefits:
# - 60% reduction in origin bandwidth
# - 10x improvement in static asset latency
# - 50% reduction in origin load
```

**Cost:** ~$50-100/month for typical CDN usage

---

## 7. Load Testing & Capacity Validation

### 7.1 Load Test Procedure

```bash
#!/bin/bash
# tests/load-test-progression.sh

# Test current capacity
echo "Testing at 500 req/s..."
ab -n 100000 -c 500 http://api.nmd.platform/health

# Test at different concurrency levels
for concurrency in 100 250 500 750 1000 1250; do
  echo "Testing at $concurrency concurrent users..."
  
  ab -n 50000 -c $concurrency \
    -H "Authorization: Bearer $TOKEN" \
    http://api.nmd.platform/api/content?limit=10
  
  # Capture metrics
  curl -s 'http://localhost:9091/api/v1/query?query=rate(http_requests_total[1m])' >> /tmp/load_test_results.json
  
  sleep 30  # Cool down between tests
done

# Report
echo "Load test complete. Review /tmp/load_test_results.json"
```

### 7.2 Capacity Headroom Guidelines

**Safe Operating Range (Headroom):**
- Compute: 30-40% unused capacity
- Database: 20-30% connection availability
- Cache: 20-25% memory available
- Storage: 20% free space
- Bandwidth: 20-30% headroom

**Formula:**
```
Current_Load + Growth_Projection + Headroom = Required_Capacity

Example:
- Current: 1,200 req/s (100% utilization)
- Q3 Growth: +360 req/s (30%)
- Total needed: 1,200 req/s
- With 35% headroom: 1,200 × 1.35 = 1,620 req/s capacity needed
```

---

## 8. Cost-Capacity Tradeoff

### 8.1 Right-sizing vs. Overprovisioning

```
Underprovisioned:
- Low cost ($5,000/month)
- High latency (100-200ms)
- Poor user experience
- Risk of outages
❌ Not recommended

Right-sized:
- Moderate cost ($6,500-8,000/month)
- Good latency (45-100ms)
- Good user experience
- Comfortable headroom (30-40%)
✅ Recommended

Overprovisioned:
- High cost ($10,000-15,000/month)
- Excellent latency (20-50ms)
- Wasted resources
- Unnecessary costs
❌ Only if exceptional performance needed
```

### 8.2 Capacity Planning Checklist

Before scaling:
- [ ] Confirm load projections with usage data
- [ ] Validate current bottlenecks (DB? Cache? Compute?)
- [ ] Run load tests to validate scaling assumptions
- [ ] Cost-benefit analysis
- [ ] Implementation plan with rollback procedure
- [ ] Monitoring and alerting configured
- [ ] Team trained on new infrastructure
- [ ] Disaster recovery updated for new topology

---

## 9. Scaling Timeline

### 9.1 12-Month Capacity Roadmap (Realistic Growth 30%/year)

**Current (Q3 2024):**
- Capacity: 1,200 req/s
- Database: 500 GB
- Cache: 2 GB
- Cost: $8,500/month

**Q4 2024:**
- Capacity: 1,400 req/s (30% growth)
- Action: Optimize queries, add indexes
- Cost: $8,500/month (no scaling needed yet)

**Q1 2025:**
- Capacity: 1,600 req/s
- Action: Scale to 4 compute instances
- DB: 650 GB (archive old data)
- Cost: $9,500/month (+$1,000)

**Q2 2025:**
- Capacity: 1,850 req/s
- Action: Increase pool size, add read replica
- Cache: 3 GB
- Cost: $10,500/month (+$1,000)

**Q3 2025:**
- Capacity: 2,150 req/s
- Action: Scale to 6 compute instances
- DB: 1 TB
- Cost: $11,500/month (+$1,000)

**Q4 2025:**
- Capacity: 2,500 req/s
- Action: Implement Kubernetes, multi-region
- Cost: $12,500-14,000/month

---

## 10. Quarterly Review Process

**Every quarter, review:**
1. Actual traffic growth vs. projections
2. Resource utilization trends
3. Cost per request
4. Performance metrics (latency, error rate, uptime)
5. Upcoming capacity needs (next 2 quarters)
6. Cost optimization opportunities
7. Update scaling timeline

**Action Items:**
- If growth >40%: accelerate scaling
- If growth <10%: consider downscaling
- If cost >target: implement cost optimizations
- If latency degrading: investigate bottlenecks

---

**Document Version:** 1.0
**Last Updated:** 2024-07-31
**Owner:** Platform Engineering Team
**Next Review:** 2024-10-31 (Quarterly Review)
