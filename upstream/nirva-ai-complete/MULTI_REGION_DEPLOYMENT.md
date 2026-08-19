# Phase 15: Multi-Region & Global Deployment

## Overview

Multi-region deployment ensures global availability, reduces latency for users worldwide, and provides disaster recovery capabilities. This phase implements AWS multi-region architecture with CloudFront CDN, Route 53 for global traffic management, and automated failover.

## Global Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Global Users                             │
└──────────────┬──────────────────────────────────────┬────────────┘
               │                                      │
        ┌──────▼──────┐                      ┌───────▼─────────┐
        │ CloudFront  │◄───────────────────►│ Route 53        │
        │ (CDN Edge)  │                     │ (Global DNS)    │
        └──────┬──────┘                      └────────┬────────┘
               │                                      │
        ┌──────┴─────────────────────────────────────┴──────┐
        │                                                   │
   ┌────▼──────────┐                        ┌──────────────▼────┐
   │ US-EAST-1     │                        │ EU-WEST-1         │
   │ (Primary)     │                        │ (Secondary)       │
   │               │                        │                   │
   │ ┌───────────┐ │                        │ ┌───────────────┐ │
   │ │   ALB     │ │                        │ │     ALB       │ │
   │ └─────┬─────┘ │                        │ └────────┬──────┘ │
   │       │       │                        │          │        │
   │ ┌─────▼─────┐ │                        │ ┌────────▼─────┐  │
   │ │ ECS/Pods  │ │                        │ │  ECS/Pods    │  │
   │ └───────────┘ │                        │ └──────────────┘  │
   │       │       │                        │          │        │
   │ ┌─────▼──────────┐                     │ ┌───────▼──────┐  │
   │ │ RDS Primary    │                     │ │ RDS Replica  │  │
   │ │ + Global DB    │◄────────────────────┼─│ + Global DB  │  │
   │ └────────────────┘                     │ └──────────────┘  │
   │       │                                │          │        │
   │ ┌─────▼─────────────────┐              │ ┌────────▼───────┐│
   │ │ ElastiCache (Primary) │◄─────────────┼─│ ElastiCache    ││
   │ │ (Redis Cluster)       │              │ │ (Replica)      ││
   │ └───────────────────────┘              │ └────────────────┘│
   │       │                                │                   │
   │ ┌─────▼──────────────────────┐         │ ┌────────────────┐│
   │ │ S3 (us-east-1)             │         │ │ S3 (eu-west-1)││
   │ │ + Cross-Region Replication │◄────────┼─│ + CRR          ││
   │ └────────────────────────────┘         │ └────────────────┘│
   │                                        │                   │
   │ ┌──────────────────────────────┐       │ ┌────────────────┐│
   │ │ CloudWatch + X-Ray           │       │ │ CloudWatch     ││
   │ │ (Centralized Monitoring)     │◄──────┼─│ (Regional)     ││
   │ └──────────────────────────────┘       │ └────────────────┘│
   └────────────────────────────────────────┴───────────────────┘
```

## 1. AWS Multi-Region Architecture

### Primary Region: US-EAST-1 (Virginia)
- **Role**: Primary region handling 70% of traffic
- **Services**: 
  - Application servers (ECS Fargate)
  - RDS primary database
  - ElastiCache primary cluster
  - S3 bucket with versioning
  - DynamoDB tables (if used)

### Secondary Region: EU-WEST-1 (Ireland)
- **Role**: Secondary region handling 30% of traffic, disaster recovery
- **Services**:
  - Application servers (ECS Fargate) - standby
  - RDS read replica (can promote to primary)
  - ElastiCache read-only replica
  - S3 with cross-region replication
  - Pre-configured failover infrastructure

### Tertiary Regions (Optional): APAC
- **ap-southeast-1** (Singapore) - High-traffic regions
- **ap-northeast-1** (Tokyo) - Planned expansion

## 2. Route 53 Global Traffic Management

### Health-Based Routing

```
Route 53 Configuration:
├── Primary Policy (Weighted: 70%)
│   ├── Region: US-EAST-1
│   ├── Target: ALB endpoint
│   └── Health Check: TCP:443 every 30s
│
├── Secondary Policy (Weighted: 30%)
│   ├── Region: EU-WEST-1
│   ├── Target: ALB endpoint
│   └── Health Check: TCP:443 every 30s
│
└── Failover Rules
    ├── Condition: Primary unhealthy
    ├── Action: Route 100% to secondary
    └── Recovery: Auto-failback when primary healthy
```

### Health Check Configuration

```typescript
// AWS SDK Health Check Setup
interface HealthCheckConfig {
  type: 'HTTPS' | 'CLOUDWATCH_METRIC';
  ipAddress: string;
  port: 443;
  resourcePath: '/health';
  requestInterval: 30; // seconds (fast interval)
  failureThreshold: 3; // consecutive failures
  measureLatency: true;
  healthChecker: 'CloudWatch';
  alarmIdentifier?: string;
}

// Primary region health check
const primaryHealthCheck = {
  type: 'HTTPS',
  ipAddress: '10.0.1.50', // ALB in us-east-1
  resourcePath: '/health/deep',
  requestInterval: 30,
  failureThreshold: 3,
};

// Secondary region health check
const secondaryHealthCheck = {
  type: 'HTTPS',
  ipAddress: '10.1.1.50', // ALB in eu-west-1
  resourcePath: '/health/deep',
  requestInterval: 30,
  failureThreshold: 3,
};

// Latency-based routing for optimal performance
interface LatencyRoutingPolicy {
  weightedRoutingPolicy: {
    primary: {
      region: 'us-east-1',
      weight: 70,
      setIdentifier: 'primary-us-east-1',
    },
    secondary: {
      region: 'eu-west-1',
      weight: 30,
      setIdentifier: 'secondary-eu-west-1',
    },
  },
  geolocationRoutingPolicy: {
    'US+Canada': 'us-east-1',
    'Europe': 'eu-west-1',
    'Asia-Pacific': 'ap-southeast-1', // future
    'default': 'us-east-1', // fallback
  },
}
```

### Traffic Distribution Strategy

1. **Weighted Routing**: 70% primary, 30% secondary
2. **Geolocation Routing**: Route users to nearest region
3. **Latency-Based Routing**: Route to lowest-latency endpoint
4. **Failover Routing**: Automatic failover on health check failure

## 3. CloudFront CDN Distribution

### CDN Configuration

```typescript
interface CloudFrontDistribution {
  // Origin Configuration
  origins: [
    {
      id: 'api-primary',
      domainName: 'api.nmd.platform',
      originPath: '/api',
      customHeaders: [
        {
          headerName: 'X-Origin-Region',
          headerValue: 'us-east-1',
        }
      ],
      healthCheckPath: '/health',
    },
    {
      id: 's3-assets',
      domainName: 'nmd-assets.s3.amazonaws.com',
      s3OriginConfig: {
        originAccessIdentity: 'origin-access-identity/cloudfront/ABCDEFG',
      },
    }
  ],
  
  // Cache Behaviors
  defaultCacheBehavior: {
    targetOriginId: 'api-primary',
    viewerProtocolPolicy: 'https-only',
    allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
    cachedMethods: ['GET', 'HEAD'],
    compress: true,
    cachePolicyId: 'Managed-CachingOptimized',
    
    // Headers to forward
    headerBehavior: 'whitelist',
    headers: ['Authorization', 'Accept', 'Accept-Language'],
    
    // Cookies
    cookieBehavior: 'whitelist',
    cookies: ['sessionId', 'userId'],
    
    // Query strings
    queryStringBehavior: 'all',
  },
  
  // Cache behaviors for different paths
  cacheBehaviors: [
    {
      pathPattern: '/api/static/*',
      targetOriginId: 's3-assets',
      viewerProtocolPolicy: 'https-only',
      cachePolicyId: 'Managed-CachingDisabled',
      compress: true,
    },
    {
      pathPattern: '/api/public/*',
      targetOriginId: 'api-primary',
      viewerProtocolPolicy: 'https-only',
      cachePolicyId: 'Managed-CachingOptimized',
      ttl: 3600, // 1 hour
    },
    {
      pathPattern: '/api/user/*',
      targetOriginId: 'api-primary',
      viewerProtocolPolicy: 'https-only',
      cachePolicyId: 'Managed-CachingDisabled',
      forwardedValues: {
        queryString: true,
        headers: ['Authorization'],
        cookies: { forward: 'all' },
      },
    }
  ],
  
  // Geo-restriction
  geoRestriction: {
    restrictionType: 'none', // or 'whitelist'/'blacklist'
  },
  
  // Security
  webAclId: 'arn:aws:wafv2:us-east-1:123456789:global/webacl/nmd-waf',
  
  // HTTP/2 and HTTP/3
  httpVersion: 'http2and3',
}
```

### Edge Location Strategy

- **Static Assets**: Cache for 24 hours in edge locations
- **API Responses**: Cache by URL and Auth header
- **User-Specific Data**: Cache-control: private, no-cache
- **Health Endpoints**: No caching, bypass cache

### Cache Invalidation

```typescript
// Automated cache invalidation on updates
interface CacheInvalidationTrigger {
  // Invalidate on content updates
  invalidationPatterns: [
    '/api/content/*',      // Content changed
    '/api/org/*',          // Organization settings changed
    '/api/user/profile/*', // User profile updated
  ],
  
  // Scheduled invalidations
  scheduledInvalidation: {
    contentHeavy: '0 2 * * *', // 2 AM UTC daily
    frequency: '24h',
  },
  
  // Triggered invalidation
  eventBasedInvalidation: {
    'content.published': '/api/content/*',
    'content.archived': '/api/content/*',
    'organization.updated': '/api/org/*',
  }
}

// AWS SDK invalidation call
async function invalidateCloudFront(paths: string[]): Promise<void> {
  const cloudfront = new AWS.CloudFront();
  
  const params = {
    DistributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID,
    InvalidationBatch: {
      Items: paths,
      Quantity: paths.length,
      CallerReference: Date.now().toString(),
    },
  };
  
  await cloudfront.createInvalidation(params).promise();
}
```

## 4. Database Replication Strategy

### RDS Global Database

```typescript
interface GlobalDatabaseConfig {
  // Primary region database
  primary: {
    region: 'us-east-1',
    engine: 'postgres',
    engineVersion: '15.3',
    instanceClass: 'db.r6i.2xlarge',
    allocatedStorage: 500, // GB
    multiAZ: true,
    
    // Backups
    backupRetentionPeriod: 30,
    preferredBackupWindow: '03:00-04:00', // UTC
    preferredMaintenanceWindow: 'mon:04:00-mon:05:00',
    
    // High availability
    enableIAMDatabaseAuthentication: true,
    enableCloudwatchLogsExports: ['postgresql'],
    deletionProtection: true,
  },
  
  // Secondary region database
  secondary: {
    region: 'eu-west-1',
    engine: 'postgres',
    engineVersion: '15.3',
    instanceClass: 'db.r6i.xlarge', // Smaller for standby
    allocatedStorage: 500,
    multiAZ: false,
    
    // Read-only replica
    readOnly: true,
  },
  
  // Replication configuration
  replication: {
    replicationLag: '<1s', // Target RPO
    autoFailover: true,
    failoverTimeRPO: 1, // minute
    failoverTimeRTO: 5, // minutes
  },
}

// Write operations always go to primary
async function writeToDatabase(query: string, params: any[]): Promise<any> {
  // Connect to us-east-1 primary
  const connection = await connectionPool.getConnection('primary');
  return connection.query(query, params);
}

// Read operations can use replicas
async function readFromDatabase(query: string, params: any[], localRegion?: string): Promise<any> {
  // Use local replica if available
  const target = localRegion === 'eu-west-1' ? 'replica-eu' : 'replica-us';
  const connection = await connectionPool.getConnection(target);
  return connection.query(query, params);
}
```

### Database Failover Procedure

```typescript
interface FailoverProcedure {
  // Detection (automatic via Route 53)
  detection: {
    method: 'Route53HealthCheck',
    interval: 30, // seconds
    failureThreshold: 3,
  },
  
  // Failover steps
  failoverSteps: [
    {
      step: 1,
      action: 'Promote secondary database',
      command: 'aws rds promote-read-replica --db-instance-identifier nmd-db-eu-west-1',
      estimatedTime: '5 minutes',
    },
    {
      step: 2,
      action: 'Update connection strings',
      details: 'Point to new primary in eu-west-1',
      estimatedTime: '2 minutes',
    },
    {
      step: 3,
      action: 'Verify data consistency',
      query: 'SELECT COUNT(*) FROM content, users, organizations',
      estimatedTime: '5 minutes',
    },
    {
      step: 4,
      action: 'Update Route 53 DNS',
      details: 'Route all traffic to eu-west-1',
      estimatedTime: '1 minute',
    },
    {
      step: 5,
      action: 'Monitor application logs',
      details: 'Verify all queries routing to new primary',
      estimatedTime: 'Continuous',
    }
  ],
  
  // Recovery steps
  recoverySteps: [
    {
      step: 1,
      action: 'Restore us-east-1 database',
      method: 'Restore from latest backup',
      estimatedTime: '30 minutes',
    },
    {
      step: 2,
      action: 'Set up replication',
      direction: 'eu-west-1 (primary) -> us-east-1 (replica)',
      estimatedTime: '10 minutes',
    },
    {
      step: 3,
      action: 'Verify replication lag',
      target: '<1 second',
      estimatedTime: '5 minutes',
    },
    {
      step: 4,
      action: 'Failback to us-east-1 (optional)',
      details: 'Once primary fully recovered',
      estimatedTime: '15 minutes',
    }
  ],
}
```

## 5. ElastiCache Global Datastore

### Redis Cluster Replication

```typescript
interface RedisGlobalDatastoreConfig {
  // Primary cluster
  primary: {
    region: 'us-east-1',
    engine: 'redis',
    engineVersion: '7.0',
    cacheNodeType: 'cache.r7g.xlarge',
    numCacheClusters: 3, // Auto-failover group
    automaticFailover: true,
    
    // Cluster mode for horizontal scaling
    clusterMode: true,
    numShards: 5,
    replicasPerShard: 2,
    
    // Encryption
    transitEncryption: true,
    authToken: process.env.REDIS_AUTH_TOKEN,
    atRestEncryption: true,
  },
  
  // Secondary cluster (read-only)
  secondary: {
    region: 'eu-west-1',
    engine: 'redis',
    engineVersion: '7.0',
    cacheNodeType: 'cache.r7g.large', // Smaller for standby
    numCacheClusters: 2,
    
    // Read-only replica
    readOnly: true,
  },
  
  // Replication
  replication: {
    replicationMethod: 'async',
    replicationLag: '<100ms',
  },
}

// Redis client with multi-region support
class MultiRegionRedisClient {
  private primaryClient: redis.Cluster;
  private secondaryClient: redis.Cluster;
  
  async initialize(): Promise<void> {
    // Primary (write operations)
    this.primaryClient = redis.createCluster({
      rootNodes: [
        { url: 'redis-cluster.us-east-1.cache.amazonaws.com:6379' }
      ],
      socket: {
        tls: true,
        rejectUnauthorized: true,
      },
      password: process.env.REDIS_AUTH_TOKEN,
    });
    
    // Secondary (read operations)
    this.secondaryClient = redis.createCluster({
      rootNodes: [
        { url: 'redis-cluster-replica.eu-west-1.cache.amazonaws.com:6379' }
      ],
      socket: {
        tls: true,
        rejectUnauthorized: true,
      },
      password: process.env.REDIS_AUTH_TOKEN,
    });
  }
  
  async set(key: string, value: string, ttl?: number): Promise<void> {
    await this.primaryClient.set(key, value, {
      EX: ttl || 3600,
    });
  }
  
  async get(key: string): Promise<string | null> {
    // Try secondary first (local to current region)
    try {
      return await this.secondaryClient.get(key);
    } catch {
      // Fallback to primary if secondary unavailable
      return await this.primaryClient.get(key);
    }
  }
}
```

## 6. S3 Cross-Region Replication

### Replication Configuration

```typescript
interface S3CRRConfig {
  // Source bucket (primary region)
  source: {
    bucket: 'nmd-platform-us-east-1',
    region: 'us-east-1',
    versioning: true,
    replicationRole: 'arn:aws:iam::123456789:role/s3-replication-role',
  },
  
  // Destination bucket (secondary region)
  destination: {
    bucket: 'nmd-platform-eu-west-1',
    region: 'eu-west-1',
    storageClass: 'STANDARD_IA', // Cost optimization
  },
  
  // Replication rules
  rules: [
    {
      id: 'replicate-all-content',
      priority: 1,
      status: 'Enabled',
      filter: {
        prefix: 'content/',
      },
      destination: {
        bucket: 'arn:aws:s3:::nmd-platform-eu-west-1',
        replicationTime: {
          status: 'Enabled',
          time: { minutes: 15 }, // 15-minute RTO
        },
        storageClass: 'STANDARD',
        deleteMarkerReplication: 'Enabled',
      },
    },
    {
      id: 'replicate-user-uploads',
      priority: 2,
      status: 'Enabled',
      filter: {
        prefix: 'uploads/',
      },
      destination: {
        bucket: 'arn:aws:s3:::nmd-platform-eu-west-1',
        replicationTime: {
          status: 'Enabled',
          time: { minutes: 15 },
        },
        storageClass: 'INTELLIGENT_TIERING',
      },
    }
  ],
}

// Monitor replication status
interface ReplicationMonitoring {
  metrics: [
    {
      metric: 'ReplicationLatency',
      target: '<5 minutes',
      alarm: 'when >15 minutes',
    },
    {
      metric: 'FailedOperationCount',
      target: '0',
      alarm: 'when >0',
    },
    {
      metric: 'OperationsPending',
      target: '<100',
      alarm: 'when >1000',
    }
  ],
}
```

## 7. Global Secrets Management

### AWS Secrets Manager Multi-Region

```typescript
interface MultiRegionSecretsConfig {
  // Primary secret
  primary: {
    region: 'us-east-1',
    name: 'nmd/prod/api-keys',
    rotationRules: {
      automaticRotation: true,
      rotationPeriodInDays: 30,
      rotationLambda: 'rotate-secrets',
    },
  },
  
  // Replicated secrets
  replicas: [
    {
      region: 'eu-west-1',
      replicationStatus: 'Succeeded',
    }
  ],
  
  // Secrets to replicate
  secrets: [
    {
      name: 'database-password',
      replicate: true,
    },
    {
      name: 'api-encryption-key',
      replicate: true,
    },
    {
      name: 'jwt-signing-key',
      replicate: true,
    },
    {
      name: 'cloudfront-key-pair',
      replicate: true,
    }
  ],
}

// Secrets client with multi-region fallback
async function getSecret(secretName: string, region?: string): Promise<string> {
  const targetRegion = region || process.env.AWS_REGION || 'us-east-1';
  
  try {
    const secretsManager = new AWS.SecretsManager({ region: targetRegion });
    const response = await secretsManager.getSecretValue({
      SecretId: secretName,
    }).promise();
    
    return response.SecretString || response.SecretBinary || '';
  } catch (error) {
    // Fallback to primary region if replica fails
    if (targetRegion !== 'us-east-1') {
      console.warn(`Failed to retrieve secret from ${targetRegion}, falling back to us-east-1`);
      return getSecret(secretName, 'us-east-1');
    }
    throw error;
  }
}
```

## 8. Global Monitoring and Observability

### CloudWatch Cross-Region Dashboard

```typescript
interface GlobalMonitoringConfig {
  // Centralized dashboard
  centralDashboard: {
    region: 'us-east-1',
    name: 'NMD-Global-Health',
    refreshInterval: 60, // seconds
    
    widgets: [
      {
        type: 'Metric',
        title: 'Global Request Rate',
        metrics: [
          {
            region: 'us-east-1',
            namespace: 'AWS/ApplicationELB',
            metricName: 'RequestCount',
          },
          {
            region: 'eu-west-1',
            namespace: 'AWS/ApplicationELB',
            metricName: 'RequestCount',
          }
        ],
        stat: 'Sum',
        period: 60,
      },
      {
        type: 'Metric',
        title: 'Global Latency (p99)',
        metrics: [
          {
            region: 'us-east-1',
            namespace: 'AWS/ApplicationELB',
            metricName: 'TargetResponseTime',
          },
          {
            region: 'eu-west-1',
            namespace: 'AWS/ApplicationELB',
            metricName: 'TargetResponseTime',
          }
        ],
        stat: 'p99',
        period: 60,
      },
      {
        type: 'Metric',
        title: 'Regional Error Rates',
        metrics: [
          {
            region: 'us-east-1',
            namespace: 'AWS/ApplicationELB',
            metricName: 'HTTPCode_Target_5XX_Count',
          },
          {
            region: 'eu-west-1',
            namespace: 'AWS/ApplicationELB',
            metricName: 'HTTPCode_Target_5XX_Count',
          }
        ],
        stat: 'Sum',
        period: 60,
      },
      {
        type: 'Metric',
        title: 'Database Replication Lag',
        metrics: [
          {
            region: 'us-east-1',
            namespace: 'AWS/RDS',
            metricName: 'AuroraBinlogReplicaLag',
          }
        ],
        stat: 'Average',
        period: 60,
        threshold: 1000, // 1 second
      },
    ]
  },
  
  // Regional dashboards
  regionalDashboards: [
    {
      region: 'us-east-1',
      name: 'NMD-US-East-Regional',
      focus: ['Application Performance', 'Database Health', 'Cache Performance'],
    },
    {
      region: 'eu-west-1',
      name: 'NMD-EU-West-Regional',
      focus: ['Application Performance', 'Replica Health', 'Replication Lag'],
    }
  ],
}

// X-Ray distributed tracing across regions
interface DistributedTracingConfig {
  xRayConfiguration: {
    samplingRate: 0.1, // 10% of requests
    emitExceptions: true,
    segmentNaming: {
      pattern: 'nmd-{region}-{service}',
    },
  },
  
  // Trace cross-region requests
  tracingMiddleware: {
    captureHeaders: ['X-Forwarded-For', 'User-Agent', 'Authorization'],
    captureQueryParams: ['org_id', 'user_id', 'content_id'],
    captureResponseStatus: true,
  },
}
```

### Custom Metrics for Global Health

```typescript
interface GlobalHealthMetrics {
  metrics: [
    {
      name: 'CrossRegionLatency',
      dimensions: ['SourceRegion', 'DestinationRegion', 'ServiceName'],
      unit: 'Milliseconds',
      targets: {
        'us-east-1-to-eu-west-1': '< 150ms',
        'eu-west-1-to-us-east-1': '< 150ms',
      },
    },
    {
      name: 'ReplicationLag',
      dimensions: ['Source', 'Destination', 'DataType'],
      unit: 'Milliseconds',
      targets: {
        'database': '< 1000ms',
        'cache': '< 100ms',
        's3': '< 900s',
      },
    },
    {
      name: 'FailoverReadiness',
      dimensions: ['Region', 'ComponentType'],
      unit: 'Percent',
      targets: {
        'all': '>= 99%',
      },
    },
    {
      name: 'GlobalAvailability',
      dimensions: ['Region', 'AZ'],
      unit: 'Percent',
      targets: {
        'us-east-1': '>= 99.99%',
        'eu-west-1': '>= 99.99%',
      },
    }
  ],
}
```

## 9. Traffic Management Policies

### Route 53 Failover Configuration

```typescript
interface Route53FailoverPolicy {
  // Primary region routing
  primary: {
    recordName: 'api.nmd.platform',
    recordType: 'A',
    setIdentifier: 'primary-us-east-1',
    failoverRoutingPolicy: {
      type: 'PRIMARY',
      evaluateTargetHealth: true,
    },
    aliasTarget: {
      hostedZoneId: 'Z1234567890ABC', // ALB hosted zone
      dnsName: 'nmd-alb-us-east-1.elb.amazonaws.com',
      evaluateTargetHealth: true,
    },
    ttl: 60, // Low TTL for quick failover
  },
  
  // Secondary region routing
  secondary: {
    recordName: 'api.nmd.platform',
    recordType: 'A',
    setIdentifier: 'secondary-eu-west-1',
    failoverRoutingPolicy: {
      type: 'SECONDARY',
      evaluateTargetHealth: true,
    },
    aliasTarget: {
      hostedZoneId: 'Z0987654321XYZ', // ALB hosted zone
      dnsName: 'nmd-alb-eu-west-1.elb.amazonaws.com',
      evaluateTargetHealth: true,
    },
    ttl: 60,
  },
  
  // Health checks
  healthChecks: [
    {
      id: 'us-east-1-health',
      type: 'HTTPS',
      ipAddress: '10.0.1.50',
      port: 443,
      resourcePath: '/health/deep',
      requestInterval: 30,
      failureThreshold: 2, // Failover after 2 failures (~60s)
      measureLatency: true,
      enableSNI: true,
    },
    {
      id: 'eu-west-1-health',
      type: 'HTTPS',
      ipAddress: '10.1.1.50',
      port: 443,
      resourcePath: '/health/deep',
      requestInterval: 30,
      failureThreshold: 2,
      measureLatency: true,
      enableSNI: true,
    }
  ],
}

// Failover time calculation
const FAILOVER_TIME_RTO = {
  healthCheckInterval: 30, // seconds
  failureThreshold: 2,
  dnsUpdatePropagation: 30, // seconds
  clientCacheTTL: 60, // seconds worst-case
  total: 30 + (30 * 2) + 30 + 60 // ~3 minutes
};
```

### Geolocation-Based Routing

```typescript
interface GeolocationRoutingPolicy {
  locations: [
    {
      location: 'United States',
      countryCode: 'US',
      targetRegion: 'us-east-1',
      setIdentifier: 'us-east-1',
    },
    {
      location: 'Europe',
      countryCode: null, // All European countries
      continentCode: 'EU',
      targetRegion: 'eu-west-1',
      setIdentifier: 'eu-west-1',
    },
    {
      location: 'Asia-Pacific',
      continentCode: 'AP',
      targetRegion: 'ap-southeast-1', // Future region
      setIdentifier: 'ap-southeast-1',
    },
    {
      location: 'Default',
      targetRegion: 'us-east-1',
      setIdentifier: 'default',
    }
  ],
  
  // Override based on latency if needed
  latencyBasedFallback: true,
}
```

## 10. Multi-Region Deployment Checklist

### Pre-Deployment

- [ ] Infrastructure provisioned in secondary region (mirror primary)
- [ ] RDS Global Database configured with replication verified
- [ ] ElastiCache Global Datastore configured and tested
- [ ] S3 Cross-Region Replication configured and verified
- [ ] CloudFront distribution created with both origins
- [ ] Route 53 hosted zone configured with health checks
- [ ] Secrets Manager configured with multi-region replication
- [ ] IAM roles and permissions configured for both regions
- [ ] VPC, subnets, and security groups replicated
- [ ] SSL/TLS certificates installed in both regions
- [ ] Load balancers (ALB) configured in both regions

### Deployment

- [ ] Deploy application to secondary region (ECS/Kubernetes)
- [ ] Run smoke tests in secondary region
- [ ] Verify database replication latency (<1s)
- [ ] Verify cache replication latency (<100ms)
- [ ] Verify S3 replication lag (<15 minutes)
- [ ] Test health check endpoints return 200
- [ ] Verify CloudFront serving from edge locations
- [ ] Confirm Route 53 DNS resolving correctly
- [ ] Load test both regions simultaneously
- [ ] Verify failover triggers correctly

### Post-Deployment

- [ ] Monitor replication metrics for 24 hours
- [ ] Verify no data loss during replication
- [ ] Document failover procedures
- [ ] Train operations team on multi-region ops
- [ ] Schedule regular failover drills (monthly)
- [ ] Set up automated alerts for replication lag
- [ ] Configure backup cross-region validation
- [ ] Test disaster recovery procedures

## 11. Implementation Roadmap (6 Weeks)

### Week 1: Infrastructure Setup
- **Days 1-3**: Provision secondary region infrastructure
  - VPCs, subnets, security groups
  - ALB, NAT gateways, route tables
  - ECS cluster, task definitions
  
- **Days 4-5**: Database and Cache Setup
  - RDS Global Database creation
  - ElastiCache Global Datastore
  - S3 Cross-Region Replication
  
- **Day 6**: Monitoring and Logging Setup
  - CloudWatch cross-region dashboard
  - X-Ray tracing configuration
  - CloudTrail for audit logging

### Week 2: Traffic Management
- **Days 1-2**: Route 53 Configuration
  - Health check setup
  - Failover policies
  - Geolocation routing
  
- **Days 3-4**: CloudFront Distribution
  - Edge location setup
  - Cache behaviors
  - Origin configuration
  
- **Day 5-6**: Testing and Validation
  - Load testing from both regions
  - Failover testing
  - Latency measurement

### Week 3: Application Deployment
- **Days 1-2**: Deploy to secondary region
  - Application servers
  - Configuration management
  - Database migrations
  
- **Days 3-4**: Integration Testing
  - Cross-region requests
  - Replication verification
  - Data consistency checks
  
- **Days 5-6**: Performance Testing
  - Latency measurement
  - Throughput validation
  - Error rate monitoring

### Week 4: Failover Procedures
- **Days 1-2**: Document failover procedures
  - Database failover
  - Application failover
  - DNS cutover
  
- **Days 3-4**: Run failover drills
  - Simulate primary region failure
  - Verify automatic failover
  - Test recovery procedures
  
- **Days 5-6**: Team Training
  - Operations training
  - Troubleshooting guide
  - On-call procedures

### Week 5: Optimization
- **Days 1-2**: Performance tuning
  - Cache hit rates optimization
  - Query optimization
  - Connection pooling
  
- **Days 3-4**: Cost optimization
  - Reserved capacity
  - Spot instances
  - Auto-scaling policies
  
- **Days 5-6**: Security hardening
  - WAF rules
  - Network ACLs
  - Encryption verification

### Week 6: Production Hardening
- **Days 1-2**: Load testing (200% capacity)
  - Sustained load testing
  - Spike testing
  - Endurance testing
  
- **Days 3-4**: Monitoring and Alerting
  - Alert thresholds tuning
  - Dashboard refinement
  - Runbook updates
  
- **Days 5-6**: Go-live Preparation
  - Final validation
  - Rollback procedures
  - Incident response planning

## 12. Global Deployment Success Criteria

✅ **Availability**: 99.99% uptime across all regions
✅ **Latency**: <200ms p99 latency from all regions to nearest edge location
✅ **Failover Time**: Automatic failover within 3 minutes (RTO)
✅ **Data Loss**: <1 hour recovery point (RPO)
✅ **Replication**: <1 second database, <100ms cache, <15 minutes S3
✅ **Redundancy**: Active-passive with auto-promotion capability
✅ **Cost**: 1.4x cost of single region (acceptable for 99.99% availability)
✅ **Compliance**: GDPR compliance with regional data residency
✅ **Monitoring**: Full observability with cross-region dashboards
✅ **Documentation**: Comprehensive runbooks and procedures

## Notes

- **Cost Impact**: Multi-region deployment increases infrastructure costs by ~40% (secondary region operates at 30% capacity)
- **Complexity**: Significantly increases operational complexity; requires dedicated ops team
- **Testing**: Regular failover drills (monthly) essential to maintain readiness
- **Data Consistency**: Global database provides eventual consistency; implement application-level consistency checks if needed
- **Compliance**: Verify GDPR data residency requirements for each region
- **Geo-Routing**: Can serve users from nearest region, improving performance and compliance

## References

- AWS Global Infrastructure: https://aws.amazon.com/about-aws/global-infrastructure/
- Route 53 Failover: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy.html
- RDS Global Database: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.GlobalDatabase.html
- CloudFront Distributions: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-overview.html
- S3 Cross-Region Replication: https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication.html
