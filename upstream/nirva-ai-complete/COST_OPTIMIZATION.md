# COST_OPTIMIZATION.md

## Overview

This document provides strategies for optimizing operational costs and performance of the Nirva Media Operations (NMD) Platform. By following these guidelines, you can reduce cloud infrastructure spend by 30-50% while maintaining or improving system performance.

**Current Baseline (Production):**
- Monthly infrastructure cost: ~$8,500
- Cost per request: ~$0.00008
- Database: 60% of costs
- Compute: 25% of costs
- Storage: 10% of costs
- Monitoring/Tools: 5% of costs

**Optimization Targets:**
- Reduce to ~$5,000/month (40% savings)
- Cost per request: ~$0.00005
- Maintain 99.9% uptime and <100ms p95 latency

---

## 1. Database Optimization

### 1.1 Query Optimization (Highest Impact - Est. 20-30% savings)

**Identify Slow Queries:**
```sql
-- Enable slow query logging
ALTER SYSTEM SET log_min_duration_statement = 1000;  -- Log queries >1 second
SELECT pg_reload_conf();

-- View slow queries from logs
docker exec postgres tail -100 /var/log/postgresql/postgresql.log | grep "duration:"

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM content WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 20;
```

**Common Issues & Fixes:**

**1. Missing Indexes**
```sql
-- Before: Sequential scan on 1M rows
EXPLAIN SELECT * FROM content WHERE organization_id = 5 AND status = 'published';
-- Cost: 50,000 seq scans

-- Fix: Add composite index
CREATE INDEX CONCURRENTLY idx_content_org_status ON content(organization_id, status);

-- After: Index scan
-- Cost: 10 index scans
```

**2. N+1 Query Problem**
```javascript
// Before: N+1 queries (1 content + N templates)
const contents = await db.query('SELECT * FROM content LIMIT 100');
for (const content of contents) {
  content.template = await db.query('SELECT * FROM templates WHERE id = $1', [content.template_id]);
}
// Total queries: 101

// After: Single JOIN query
const contents = await db.query(`
  SELECT c.*, t.* FROM content c
  LEFT JOIN templates t ON c.template_id = t.id
  LIMIT 100
`);
// Total queries: 1
```

**3. Full Table Scans on Large Columns**
```sql
-- Before: Scanning full text column
SELECT * FROM content WHERE body LIKE '%keyword%';
-- Scans entire body column for 1M rows

-- Fix: Use full-text search with GIN index
CREATE INDEX idx_content_body_fts ON content USING GIN(to_tsvector('english', body));

SELECT * FROM content WHERE to_tsvector('english', body) @@ plainto_tsquery('keyword');
-- Uses index, 10-100x faster
```

**4. Aggregation Query Optimization**
```sql
-- Before: Aggregating 1M rows on each request
SELECT organization_id, COUNT(*) FROM content GROUP BY organization_id;
-- Takes 5+ seconds

-- Fix: Pre-aggregate into materialized view with hourly refresh
CREATE MATERIALIZED VIEW content_counts_by_org AS
SELECT organization_id, COUNT(*) as count FROM content GROUP BY organization_id;

CREATE INDEX ON content_counts_by_org(organization_id);

-- Refresh every hour
0 * * * * psql -c "REFRESH MATERIALIZED VIEW CONCURRENTLY content_counts_by_org;"

-- Query now returns instantly
SELECT * FROM content_counts_by_org WHERE organization_id = 5;
```

### 1.2 Connection Pooling Optimization (Est. 10% savings)

**Current Setup:**
```bash
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20
```

**Optimization:**
```bash
# Reduce maximum connections if not hitting limits
# Monitor connection usage first
DATABASE_POOL_MIN=2      # Min connections (was 5)
DATABASE_POOL_MAX=10     # Max connections (was 20)
DATABASE_IDLE_TIMEOUT=30000  # Close idle connections after 30s

# Use PgBouncer for connection pooling (if using external DB)
# This provides a separate connection pool layer, reducing direct DB load
```

**Monitoring:**
```sql
-- Check connection usage
SELECT count(*) FROM pg_stat_activity;

-- Check for idle connections
SELECT count(*) FROM pg_stat_activity WHERE state = 'idle';

-- If idle > 50% of max, reduce DATABASE_POOL_MAX
```

**Expected Savings:** 10% database costs ($200-300/month)

### 1.3 Data Archival & Partitioning (Est. 15% savings)

**Archive Old Data:**
```sql
-- Create archive table
CREATE TABLE content_archive (LIKE content);

-- Move data older than 1 year to archive
INSERT INTO content_archive SELECT * FROM content WHERE created_at < NOW() - INTERVAL '1 year';
DELETE FROM content WHERE created_at < NOW() - INTERVAL '1 year';

-- Store archive in cheaper S3 Glacier storage
aws s3 cp /backups/content_archive.csv s3://nmd-archive/content/ --storage-class GLACIER

-- For searches, create view that includes archive if needed
CREATE VIEW content_all AS
SELECT * FROM content
UNION ALL
SELECT * FROM content_archive WHERE created_at > NOW() - INTERVAL '2 years';
```

**Table Partitioning:**
```sql
-- Partition content table by month (improves query performance on time ranges)
CREATE TABLE content_2024_01 PARTITION OF content
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE content_2024_02 PARTITION OF content
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Queries for specific month only scan relevant partition
SELECT * FROM content WHERE created_at >= '2024-01-01' AND created_at < '2024-02-01';
-- Only scans content_2024_01 partition
```

**Expected Savings:** 15% database costs ($300-400/month) + reduced backup sizes

---

## 2. Caching Optimization

### 2.1 Intelligent Cache Warming (Est. 25-35% compute savings)

**Current State:**
- Cache hit rate: 78%
- Cold cache on deploy causes 5-minute latency spike
- Frequently missed queries cause DB load

**Optimization Strategy:**

**1. Pre-warm Cache on Startup**
```typescript
// In API startup sequence
async function warmCache() {
  const redis = getRedisClient();
  const db = getDatabase();

  // Warm top 100 templates (used by 80% of requests)
  const topTemplates = await db.query(`
    SELECT * FROM templates 
    ORDER BY usage_count DESC 
    LIMIT 100
  `);
  
  for (const template of topTemplates) {
    await redis.setex(
      `template:${template.id}`,
      86400,  // 24-hour TTL
      JSON.stringify(template)
    );
  }

  // Warm featured content
  const featured = await db.query(`
    SELECT * FROM content 
    WHERE featured = true 
    LIMIT 50
  `);
  
  for (const content of featured) {
    await redis.setex(
      `content:${content.id}`,
      3600,  // 1-hour TTL for featured
      JSON.stringify(content)
    );
  }
}

// Call on startup
app.on('ready', warmCache);
```

**2. Implement Cache Tiers**
```typescript
// Tier 1: Hot data (1-hour TTL, update every request)
// - Top 20 templates
// - Current user's content
// - Featured articles

// Tier 2: Warm data (6-hour TTL)
// - Popular content
// - Common queries
// - Analytics summaries

// Tier 3: Cold data (24-hour TTL)
// - All templates
// - Archive content
// - Historical analytics

class CacheManager {
  async getTemplate(id) {
    // Check hot tier first
    const hotKey = `template:hot:${id}`;
    let data = await redis.get(hotKey);
    if (data) return JSON.parse(data);

    // Check warm tier
    const warmKey = `template:${id}`;
    data = await redis.get(warmKey);
    if (data) {
      // Promote to hot tier
      await redis.setex(hotKey, 3600, data);
      return JSON.parse(data);
    }

    // Fetch from DB and cache
    data = await db.query('SELECT * FROM templates WHERE id = $1', [id]);
    await redis.setex(warmKey, 21600, JSON.stringify(data));
    return data;
  }
}
```

**3. Implement Cache Invalidation Strategy**
```typescript
// Smart invalidation instead of cache clear
async function updateContent(id, updates) {
  // Update database
  const updated = await db.query(
    'UPDATE content SET updated_at = NOW(), ... WHERE id = $1 RETURNING *',
    [id]
  );

  // Invalidate only affected cache entries
  await redis.del(`content:${id}`);  // Specific content
  await redis.del(`content:hot:${id}`);  // Hot tier
  
  // Invalidate parent caches
  await redis.del(`organization:${updated.organization_id}:content:list`);
  await redis.del(`user:${updated.user_id}:recent:content`);
  
  // Don't invalidate: global top-100, featured content, analytics
  
  return updated;
}
```

**Expected Savings:** 25-35% compute costs ($200-300/month) + improved latency

### 2.2 Redis Memory Optimization (Est. 5% storage costs)

**Current Memory Usage: ~2GB**

```bash
# In redis.conf
maxmemory 1gb                    # Reduce from 2gb
maxmemory-policy allkeys-lru     # Evict least recently used

# Monitor memory usage
docker-compose exec redis redis-cli INFO memory

# Expected after optimization: 800MB-1GB
```

**Compression:**
```typescript
// Compress large objects before caching
import * as zlib from 'zlib';

async function cacheCompressed(key, data, ttl) {
  const json = JSON.stringify(data);
  const compressed = zlib.gzipSync(json);
  await redis.setex(key, ttl, compressed);
}

async function getCompressed(key) {
  const compressed = await redis.getBuffer(key);
  if (!compressed) return null;
  const json = zlib.gunzipSync(compressed);
  return JSON.parse(json);
}
```

---

## 3. Compute Optimization

### 3.1 Right-sizing Instances (Est. 20-30% compute savings)

**Current Configuration:**
```yaml
# docker-compose.yml
api:
  resources:
    limits:
      cpus: '2'
      memory: 2G
  replicas: 3  # 6 CPU cores, 6GB RAM total
```

**Analysis:**
- Average CPU usage: 15-25%
- Average memory usage: 40-50%
- Peak CPU usage: 60% (during scheduled reports)
- Peak memory usage: 65% (after code deployment)

**Optimization:**
```yaml
api:
  resources:
    limits:
      cpus: '1'      # Reduced from 2
      memory: 1G     # Reduced from 2G
    requests:
      cpus: '0.5'    # Ensure minimum resources
      memory: 512M   # Ensure minimum resources
  replicas: 2        # Reduced from 3 (with HPA for peaks)

# Add Horizontal Pod Autoscaling (if using Kubernetes)
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 2
  maxReplicas: 5
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
```

**Expected Savings:** 20-30% compute costs ($200-300/month)

### 3.2 Function Optimization (Est. 10-15% latency improvement)

**Identify Memory Leaks:**
```javascript
// Monitor heap memory
setInterval(() => {
  const used = process.memoryUsage();
  console.log('Memory:', {
    heapUsed: Math.round(used.heapUsed / 1024 / 1024) + ' MB',
    heapTotal: Math.round(used.heapTotal / 1024 / 1024) + ' MB',
    external: Math.round(used.external / 1024 / 1024) + ' MB',
    rss: Math.round(used.rss / 1024 / 1024) + ' MB',
  });
}, 60000);  // Every minute

// If heapUsed continuously grows, there's a memory leak
// Common causes: event listeners not removed, timers not cleared, circular references
```

**Optimize Hot Paths:**
```javascript
// Before: Creating new object on every request
app.get('/api/content/:id', (req, res) => {
  const response = {
    success: true,
    data: content,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV,
  };
  res.json(response);
});
// Creates 10,000 objects per second at 10 req/s

// After: Reuse object template
const responseTemplate = {
  success: true,
  data: null,
  timestamp: null,
  version: '1.0.0',
  environment: process.env.NODE_ENV,
};

app.get('/api/content/:id', (req, res) => {
  responseTemplate.data = content;
  responseTemplate.timestamp = new Date().toISOString();
  res.json(responseTemplate);
});
// Reduces GC pressure and improves performance
```

---

## 4. Storage Optimization

### 4.1 Backup Compression & Retention (Est. 30-40% storage savings)

**Current Costs:**
- Database backups: 500 MB × 24/day × 30 days = 360 GB = $100/month
- Cache backups: 50 MB × 4/day × 7 days = 1.4 GB = $5/month
- Total: $105/month

**Optimization:**

**1. Compress Backups**
```bash
# Before: Raw SQL dump
pg_dump nmd_platform > backup.sql  # 500 MB

# After: Compressed backup
pg_dump nmd_platform | gzip > backup.sql.gz  # 50 MB (10x compression)

# Storage savings: 450 MB per backup × 720 backups/month = 324 GB saved = $90/month
```

**2. Tiered Retention**
```bash
# Update backup retention policy
# - Last 7 days: Keep all hourly backups (168 backups)
# - Days 8-30: Keep daily backups only (23 backups)
# - Beyond 30 days: Archive to Glacier (quarterly backup)

aws s3 lifecycle put-bucket-lifecycle-configuration \
  --bucket nmd-backups \
  --lifecycle-configuration '{
    "Rules": [
      {
        "Id": "DeleteDaily",
        "Filter": {"Prefix": "database/daily/"},
        "Expiration": {"Days": 30}
      },
      {
        "Id": "ArchiveMonthly",
        "Filter": {"Prefix": "database/monthly/"},
        "Transitions": [{
          "Days": 90,
          "StorageClass": "GLACIER"
        }],
        "Expiration": {"Days": 2555}
      }
    ]
  }'
```

**3. Incremental Backups**
```bash
# Use WAL archiving for incremental backups instead of full dumps
# Only changes since last backup are stored

# In postgresql.conf
archive_mode = on
archive_command = 'aws s3 cp %p s3://nmd-backups/wal/%f'

# Combined with base backups: 50% space reduction
```

**Expected Savings:** 30-40% storage costs ($30-40/month)

### 4.2 Image & Asset Optimization (Est. 20-25% storage/bandwidth)

**Optimize Media Files:**
```typescript
// Use sharp for image optimization
import sharp from 'sharp';

async function optimizeImage(filePath) {
  const formats = {
    webp: { width: 1200, quality: 80 },
    jpeg: { width: 1200, quality: 80 },
    thumb: { width: 300, quality: 80 },
  };

  const results = {};
  for (const [format, opts] of Object.entries(formats)) {
    results[format] = await sharp(filePath)
      .resize(opts.width, null, { withoutEnlargement: true })
      .toFormat(format)
      .toBuffer();
  }

  // Original: 5 MB JPEG
  // WebP (80% smaller): 1 MB
  // Thumb: 0.1 MB
  // Total: 1.1 MB vs 5 MB = 78% reduction
  return results;
}
```

**S3 Configuration:**
```yaml
# Enable S3 compression
aws s3api put-bucket-acl --bucket nmd-uploads --acl private

# Enable CloudFront CDN for 10x faster delivery and 40% bandwidth savings
aws cloudfront create-distribution \
  --origin-domain-name nmd-uploads.s3.amazonaws.com \
  --default-root-object index.html \
  --compress true  # Automatic gzip compression
```

**Expected Savings:** 20-25% bandwidth costs ($30-50/month)

---

## 5. Monitoring Costs

### 5.1 Optimize Prometheus Retention (Est. 40-50% monitoring savings)

**Current Configuration:**
```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'production'
    
# Retention: 30 days × 288 scrapes/day (15s intervals) = 8,640 data points per metric
# With 1,000 metrics: 8.6M data points = ~2GB storage
```

**Optimization:**

**1. Reduce Scrape Interval for Non-Critical Metrics**
```yaml
global:
  scrape_interval: 30s  # Increased from 15s (still fine for alerts)
  
scrape_configs:
  - job_name: 'api'
    scrape_interval: 15s  # Keep high-frequency for critical API metrics
    
  - job_name: 'node'
    scrape_interval: 60s  # Increase system metrics interval
    
  - job_name: 'postgres'
    scrape_interval: 30s  # Database every 30s is sufficient
```

**Storage Savings:** 50% reduction = $1-2/month

**2. Drop Unnecessary Metrics**
```yaml
# In prometheus.yml
metric_relabel_configs:
  - source_labels: [__name__]
    regex: 'go_.*'  # Drop Go runtime metrics (not needed)
    action: drop
  - source_labels: [__name__]
    regex: 'process_.*'
    action: drop
  - source_labels: [__name__]
    regex: 'node_sockstat.*'  # Drop socket stats
    action: drop
```

**Storage Savings:** 20-30% reduction = $2-3/month

**3. Use Downsampling**
```yaml
# Keep high-resolution for 7 days, downsampled for older data
retention_size: 1GB
retention: 30d

# Use Thanos for long-term storage with automatic downsampling
# 1-minute resolution → 5-minute after 7 days → 30-minute after 30 days
```

**3. Reduce Alert Query Frequency**
```yaml
# In alerts.yml
global:
  evaluation_interval: 1m  # Evaluate alerts every minute (was 15s)

rule_files:
  - 'alerts/*.yml'
```

**Expected Savings:** 40-50% monitoring costs ($50-75/month)

---

## 6. Cost Tracking & Budgeting

### 6.1 Set Up AWS Budget Alerts

```bash
aws budgets create-budget --account-id YOUR_ACCOUNT_ID \
  --budget '{
    "BudgetName": "NMD-Monthly-Operations",
    "BudgetLimit": {
      "Amount": "5000",
      "Unit": "USD"
    },
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST"
  }' \
  --notifications-with-subscribers '[
    {
      "Notification": {
        "NotificationType": "FORECASTED",
        "ComparisonOperator": "GREATER_THAN",
        "Threshold": 85,
        "ThresholdType": "PERCENTAGE"
      },
      "Subscribers": [{"SubscriptionType": "EMAIL", "Address": "ops@nmd.platform"}]
    }
  ]'
```

### 6.2 Tag All Resources

```bash
# Tag resources for cost allocation
aws ec2 create-tags --resources $INSTANCE_ID \
  --tags \
  Key=Project,Value=NMD \
  Key=Environment,Value=production \
  Key=CostCenter,Value=infrastructure \
  Key=Owner,Value=platform-team
```

### 6.3 Create Cost Dashboard

```sql
-- Query AWS Cost Explorer API for monthly breakdown
SELECT 
  service,
  ROUND(cost, 2) as monthly_cost,
  ROUND(cost / previous_month_cost - 1, 2) as month_over_month_change
FROM infrastructure_costs
WHERE month = CURRENT_MONTH
ORDER BY cost DESC;
```

---

## 7. Performance Tuning

### 7.1 Response Time Optimization (Target: <50ms avg)

**Current Baseline:**
- Average: 45ms ✓
- p95: 98ms ✓
- p99: 195ms ✓

**Bottleneck Analysis:**

```bash
# 1. Database queries: 25ms (55%)
# 2. Network/JSON parsing: 10ms (22%)
# 3. Business logic: 7ms (15%)
# 4. Cache lookup: 3ms (8%)

# Focus optimization on database queries
```

**Database Query Optimization:**
```sql
-- Identify slowest queries
SELECT 
  query,
  calls,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Example: Slow search query
EXPLAIN ANALYZE
SELECT * FROM content 
WHERE organization_id = 1 
AND status = 'published'
AND (title ILIKE '%keyword%' OR body ILIKE '%keyword%')
ORDER BY created_at DESC
LIMIT 20;

-- Before optimization: 1,500ms
-- Add indexes:
CREATE INDEX idx_content_org_status_created ON content(organization_id, status, created_at DESC);
CREATE INDEX idx_content_body_fts ON content USING GIN(to_tsvector('english', body));

-- After optimization: 45ms (33x improvement)
```

### 7.2 Concurrent Request Handling

**Current Capacity:**
- Requests/second: 1,200 req/s
- Concurrent connections: 1,000 active

**Increase Capacity:**
```bash
# Increase Node.js event loop capacity
NODE_MAX_SOCKETS=2000

# Increase file descriptor limits
ulimit -n 65535

# Increase TCP backlog
net.core.somaxconn=65535
net.ipv4.tcp_backlog=65535
```

---

## 8. Implementation Roadmap

### Week 1-2: Database Optimization
- [ ] Identify and optimize top 10 slow queries (Est. 20% savings)
- [ ] Add missing indexes
- [ ] Implement query caching

### Week 3: Caching Enhancement
- [ ] Implement cache warming on startup
- [ ] Add tiered cache strategy
- [ ] Optimize invalidation

### Week 4-5: Compute Optimization
- [ ] Right-size instances
- [ ] Set up auto-scaling
- [ ] Profile and optimize hot paths

### Week 6: Storage & Monitoring
- [ ] Compress backups
- [ ] Implement tiered retention
- [ ] Optimize Prometheus retention
- [ ] Enable CloudFront CDN

### Week 7-8: Validation
- [ ] Measure cost reduction
- [ ] Verify performance metrics maintained
- [ ] Monitor for regressions
- [ ] Document learnings

**Expected Results:**
- Infrastructure costs: $8,500 → $5,000/month (40% reduction = $42,000/year savings)
- Performance maintained: avg <50ms, p95 <100ms, p99 <200ms
- No reliability regressions: maintain 99.9% uptime

---

## 9. Monitoring Dashboard

Create dashboard to track:
```json
{
  "panels": [
    {
      "title": "Monthly Infrastructure Cost",
      "query": "SELECT SUM(cost) FROM aws_billing WHERE month = CURRENT_MONTH"
    },
    {
      "title": "Cost Per Request",
      "query": "SELECT monthly_cost / total_requests FROM metrics"
    },
    {
      "title": "Database Query Performance",
      "query": "SELECT avg(duration) FROM pg_stat_statements"
    },
    {
      "title": "Cache Hit Rate",
      "query": "SELECT cache_hits / (cache_hits + cache_misses) FROM redis_stats"
    },
    {
      "title": "CPU Utilization",
      "query": "SELECT avg(cpu_percent) FROM instance_metrics"
    },
    {
      "title": "Storage Usage",
      "query": "SELECT size FROM aws_s3_bucket_size_bytes"
    }
  ]
}
```

---

## 10. Quarterly Review Process

**Every 3 months:**
1. Analyze actual vs. projected savings
2. Identify new optimization opportunities
3. Review performance metrics (latency, error rate, uptime)
4. Update cost forecast
5. Share findings with team

**Success Criteria:**
- Achieve 40% cost reduction ($3,500 monthly savings)
- Maintain performance: avg <50ms, p95 <100ms, p99 <200ms, uptime 99.9%
- Zero customer-impacting changes
- All optimizations documented

---

**Document Version:** 1.0
**Last Updated:** 2024-07-31
**Owner:** Platform Engineering Team
**Next Review:** 2024-10-31
