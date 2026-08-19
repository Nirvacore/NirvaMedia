# TEAM_TRAINING.md

## Overview

This document provides comprehensive training materials for the platform operations team. It covers daily operations, common troubleshooting scenarios, deployment procedures, and incident response. All team members should complete this training before operating the NMD Platform in production.

**Target Audience:**
- Platform Engineers (Required)
- On-Call Engineers (Required)
- Operations Managers (Recommended)
- Product Managers (Optional overview)
- DevOps Engineers (Required)

**Training Time:** 8-10 hours total
- Foundation (2 hours)
- Daily Operations (2 hours)
- Troubleshooting (2 hours)
- Scaling & Deployment (2 hours)
- Incident Response (2 hours)

---

## Module 1: Foundation (2 hours)

### 1.1 Platform Architecture Overview (30 minutes)

**High-Level Architecture:**
```
┌─────────────────────────────────────────────────────┐
│                    Client Applications               │
│         (Web, Mobile, Third-Party Integrations)      │
└────────────────────────┬────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│              Load Balancer / API Gateway             │
│            (Request routing, rate limiting)          │
└────────────────────────┬────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
    ┌────────┐      ┌────────┐      ┌────────┐
    │  API   │      │  API   │      │  API   │
    │Instance│      │Instance│      │Instance│
    │   #1   │      │   #2   │      │   #3   │
    └────┬───┘      └────┬───┘      └────┬───┘
         │               │               │
         └───────────────┼───────────────┘
                         ▼
        ┌────────────────────────────────┐
        │   PostgreSQL Database Cluster   │
        │  (Primary + Standbys + Replicas)│
        └────────────────────────────────┘
                         ▼
        ┌────────────────────────────────┐
        │       Redis Cache Cluster       │
        │    (3 nodes, master-slave)      │
        └────────────────────────────────┘
                         ▼
        ┌────────────────────────────────┐
        │        S3 File Storage          │
        │   (Content, backups, archives)  │
        └────────────────────────────────┘
```

**Key Components:**
- **API Layer:** Node.js application servers (3-10 instances depending on load)
- **Database:** PostgreSQL 16 with streaming replication
- **Cache:** Redis 7 for session/query caching
- **Storage:** AWS S3 for files and backups
- **Monitoring:** Prometheus + Grafana for metrics and alerting

### 1.2 Core Services (30 minutes)

**17 Core Modules:**

| Category | Modules | Purpose |
|----------|---------|---------|
| Content | content, templates, versioning, publishing | Manage media assets, versions, publishing workflow |
| Media Ops | analytics, metrics, a-b-testing, optimization | Track performance, A/B tests, optimization |
| AI | ai-assistant, content-generation | AI-powered content creation |
| Search | search, recommendation-engine | Full-text search, recommendations |
| Collaboration | webhooks, approval-workflows, notifications | External integrations, approvals, notifications |
| Performance | performance-monitoring, caching | System health monitoring, cache management |
| Security | authentication, authorization, encryption | Auth/RBAC, data security |

### 1.3 Key Concepts (1 hour)

**Multi-tenancy:**
- Every request must include `organizationId`
- Data is logically isolated per organization
- Row-level security ensures isolation in database

**RBAC (Role-Based Access Control):**
```
Admin (Unrestricted) → Manager (Create/Edit/Approve) → Editor (Create/Edit) → Viewer (Read-only)
```

**Feature Flags:**
- Control feature rollout (0-100%)
- Override for specific users
- A/B testing variants

**Rate Limiting:**
- 100 requests per 15 minutes per API key
- Hard limit at 1,000 concurrent requests
- Returns 429 (Too Many Requests) when exceeded

**Error Codes:**
```
200 OK           - Success
400 Bad Request  - Invalid input
401 Unauthorized - Missing/invalid auth
403 Forbidden    - Insufficient permissions
404 Not Found    - Resource doesn't exist
429 Too Many Requests - Rate limit exceeded
500 Server Error - Internal error (log + alert)
503 Unavailable  - Maintenance or degraded service
```

---

## Module 2: Daily Operations (2 hours)

### 2.1 Health Checks (15 minutes)

**Daily Health Check Procedure:**

```bash
#!/bin/bash
# scripts/daily-health-check.sh

echo "=== NMD Platform Daily Health Check ==="
echo "Time: $(date)"

# 1. API Health
echo -e "\n1. API Health..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://api.nmd.platform/health)
if [ "$RESPONSE" == "200" ]; then
  echo "✅ API responding: $RESPONSE"
else
  echo "❌ API unhealthy: $RESPONSE"
  echo "ACTION: Check API logs: docker-compose logs api"
fi

# 2. Database Health
echo -e "\n2. Database Health..."
DB_CONN=$(docker exec postgres psql -U postgres -c "SELECT COUNT(*) FROM pg_stat_activity;" | tail -1)
echo "✅ Database connections: $DB_CONN"

# 3. Cache Health
echo -e "\n3. Cache Health..."
CACHE_HEALTH=$(docker-compose exec redis redis-cli ping)
if [ "$CACHE_HEALTH" == "PONG" ]; then
  echo "✅ Cache healthy: $CACHE_HEALTH"
else
  echo "❌ Cache unhealthy"
  echo "ACTION: Restart Redis: docker-compose restart redis"
fi

# 4. Disk Usage
echo -e "\n4. Disk Usage..."
DISK_USAGE=$(df / | tail -1 | awk '{print $5}')
echo "Disk usage: $DISK_USAGE"
if [ "${DISK_USAGE%\%}" -gt 80 ]; then
  echo "⚠️  WARNING: Disk >80%"
  echo "ACTION: Run cleanup: make clean"
fi

# 5. Error Rate
echo -e "\n5. Error Rate (last hour)..."
ERROR_RATE=$(curl -s 'http://prometheus:9090/api/v1/query?query=rate(http_errors_total[1h])' | jq '.data.result[0].value[1]')
echo "Error rate: $ERROR_RATE"

# 6. Backup Status
echo -e "\n6. Latest Backup..."
LATEST_BACKUP=$(ls -lt /backups/full/*.sql 2>/dev/null | head -1 | awk '{print $NF}')
BACKUP_TIME=$(stat "$LATEST_BACKUP" 2>/dev/null | grep Modify | awk '{print $2, $3}')
echo "Latest backup: $BACKUP_TIME"

# Summary
echo -e "\n=== Summary ==="
echo "Status: HEALTHY (if all checks green)"
echo "Escalate to: On-Call Engineer if any red checks"
```

**Run Daily:** 9 AM before business hours
**Owner:** Ops team
**Action if Alert:** Page on-call engineer immediately

### 2.2 Log Monitoring (30 minutes)

**What to Look For:**

```bash
# Check for errors in last hour
docker-compose logs api --since 1h | grep -i error

# Check for warnings
docker-compose logs api --since 1h | grep -i warn

# Check for database errors
docker-compose logs postgres --since 1h | grep -i error

# Check for slow queries (>1 second)
docker exec postgres tail -20 /var/log/postgresql/postgresql.log | grep "duration:"
```

**Common Error Patterns:**

| Pattern | Meaning | Action |
|---------|---------|--------|
| `Connection pool exhausted` | Too many DB connections | Increase pool size |
| `FATAL: remaining connection slots reserved` | PostgreSQL at max | Scale database |
| `Memory exhausted` | Out of memory | Restart service or scale |
| `No route to host` | Network/DNS issue | Check network config |
| `Too many open files` | File descriptor limit hit | Increase ulimit |
| `ECONNREFUSED` | Connection refused | Service not running |

### 2.3 Metrics Review (45 minutes)

**Access Grafana Dashboard:**
```
URL: http://localhost:3001
Username: admin
Password: admin (change on first login!)
```

**Key Panels to Monitor:**

1. **Request Rate:**
   - Target: 1,200 req/s baseline
   - Acceptable: 800-1,500 req/s
   - Action if >1,500: Check for unusual traffic or scale up

2. **Error Rate:**
   - Target: <0.5%
   - Warning: >1%
   - Critical: >5%
   - Action: Review error logs for patterns

3. **Response Time (p95):**
   - Target: <100ms
   - Warning: >150ms
   - Critical: >300ms
   - Action: Check query performance, add indexes

4. **Database Connections:**
   - Target: 5-15 active
   - Warning: >16
   - Critical: >19 (of 20 max)
   - Action: Investigate connection leaks or scale DB

5. **Cache Hit Rate:**
   - Target: >75%
   - Warning: 50-75%
   - Critical: <50%
   - Action: Analyze cache misses, warm cache

6. **Disk Usage:**
   - Target: <60%
   - Warning: 60-80%
   - Critical: >80%
   - Action: Archive old data or extend disk

---

## Module 3: Troubleshooting (2 hours)

### 3.1 Slow Requests

**Diagnosis:**

```bash
# Step 1: Identify slow endpoints
curl -s http://prometheus:9090/api/v1/query?query='histogram_quantile(0.95,http_request_duration_ms_bucket)' | jq

# Step 2: Check database query performance
docker exec postgres psql -U postgres -c "
SELECT query, calls, mean_time, max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;"

# Step 3: Check if index exists
docker exec postgres psql -U postgres -c "
SELECT indexname FROM pg_indexes
WHERE tablename = 'content' AND indexname LIKE '%organization%';"

# Step 4: Test with EXPLAIN ANALYZE
docker exec postgres psql -U postgres -c "
EXPLAIN ANALYZE
SELECT * FROM content WHERE organization_id = 1 LIMIT 10;"
```

**Solutions:**

```sql
-- Solution 1: Add missing index
CREATE INDEX CONCURRENTLY idx_content_org_created 
ON content(organization_id, created_at DESC);

-- Solution 2: Optimize JOIN
-- Before: Multiple queries
SELECT * FROM content WHERE org_id = 1;
-- Then for each row: SELECT * FROM templates WHERE id = template_id;

-- After: Single JOIN
SELECT c.*, t.* FROM content c
LEFT JOIN templates t ON c.template_id = t.id
WHERE c.organization_id = 1;

-- Solution 3: Add cache
-- Store results in Redis with 5-minute TTL
```

### 3.2 High Error Rate

**Diagnosis:**

```bash
# Step 1: Count errors by type
docker-compose logs api --since 1h | grep -i error | sort | uniq -c | sort -rn

# Step 2: Get error details
docker-compose logs api --since 30m | grep "ERROR"

# Step 3: Check status codes
curl -s 'http://prometheus:9090/api/v1/query?query=rate(http_requests_total{status=~"5.."}[5m])' | jq

# Step 4: Check database connectivity
docker exec api psql $DATABASE_URL -c "SELECT 1;"
```

**Solutions:**

```
500 errors → Check application logs, may need restart
400 errors → Client sending bad requests (usually normal)
401/403 → Auth issue, verify JWT tokens
429 → Rate limit hit, expected under load
503 → Service temporarily unavailable, check dependent services
```

### 3.3 Memory Leak Detection

**Symptoms:**
- Memory usage continuously increasing
- `heapUsed` growing over hours
- Periodic crashes when OOM

**Diagnosis:**

```bash
# 1. Enable Node.js memory logging
export DEBUG=* # This will show memory stats

# 2. Take heap snapshot
node --inspect app.js
# Then in Chrome DevTools: chrome://inspect

# 3. Monitor memory trends
watch -n 5 'docker stats api | grep -v CONTAINER'

# 4. Check for event listener leaks
docker-compose logs api | grep "MaxListenersExceeded"
```

**Common Causes & Fixes:**

```javascript
// Cause 1: Event listeners not removed
emitter.on('data', handler);
// Fix:
emitter.once('data', handler);  // Auto-removes after first call
// Or explicitly:
emitter.off('data', handler);

// Cause 2: Timers not cleared
setInterval(() => {...}, 1000);
// Fix:
const timer = setInterval(() => {...}, 1000);
clearInterval(timer);  // On shutdown

// Cause 3: Large objects held in memory
let cache = {};
app.get('/api', (req, res) => {
  cache[req.query.id] = largeObject;  // Grows indefinitely
});
// Fix: Use Redis instead
await redis.setex(key, 3600, value);  // Auto-expires

// Cause 4: Circular references
const obj1 = {};
const obj2 = {};
obj1.ref = obj2;
obj2.ref = obj1;  // Circular reference
// Fix: Use WeakMap for back-references
```

### 3.4 Database Connection Pool Exhaustion

**Diagnosis:**

```sql
-- Check active connections
SELECT count(*) as active_connections FROM pg_stat_activity;

-- See what queries are running
SELECT pid, usename, state, query FROM pg_stat_activity 
WHERE state != 'idle' LIMIT 10;

-- Find long-running queries
SELECT pid, query_start, query FROM pg_stat_activity 
WHERE query_start < now() - interval '5 minutes';
```

**Solutions:**

```bash
# Quick fix: Kill idle connections
docker exec postgres psql -U postgres -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle' AND query_start < now() - interval '10 minutes';"

# Permanent fix: Increase pool size
# In .env:
DATABASE_POOL_MAX=30  # Increase from 20

# Restart API
docker-compose restart api

# Implement connection pooling (PgBouncer)
# For high-connection scenarios (>50 connections)
```

### 3.5 High Latency

**Diagnosis:**

```bash
# Check response time by endpoint
curl -s 'http://prometheus:9090/api/v1/query?query=histogram_quantile(0.95,rate(http_request_duration_ms_bucket[5m]))' | jq '.data.result[] | {endpoint: .metric.path, p95_ms: .value[1]}'

# Check database query time
SELECT query, mean_time, max_time FROM pg_stat_statements
ORDER BY mean_time DESC LIMIT 5;

# Check CPU usage
docker stats api

# Check cache hit rate
docker-compose exec redis redis-cli INFO stats | grep -E "hits|misses"
```

**Solutions:**

| Issue | Solution |
|-------|----------|
| Slow DB queries | Add indexes, optimize queries |
| Low cache hit rate | Pre-warm cache, increase TTL |
| High CPU usage | Scale horizontally, optimize code |
| High memory usage | Find memory leak, increase size |
| Network latency | Check network config, use CDN |

---

## Module 4: Scaling & Deployment (2 hours)

### 4.1 Horizontal Scaling (1 hour)

**When to Scale:**
```
IF request_rate > 1000 req/s
   OR cpu_usage > 75%
   OR p95_latency > 150ms
   THEN scale_up()
```

**Scaling Procedure:**

```bash
#!/bin/bash
# scripts/scale-up.sh

REPLICAS=$1  # e.g., 4 to go from 3→4 instances

echo "Scaling API to $REPLICAS instances..."

# 1. Update docker-compose.yml
sed -i "s/replicas: [0-9]*/replicas: $REPLICAS/" docker-compose.yml

# 2. Bring up new instances
docker-compose up -d api

# 3. Wait for health checks
echo "Waiting for instances to be healthy..."
for i in {1..30}; do
  HEALTHY=$(docker-compose ps api | grep -c "healthy")
  if [ $HEALTHY -eq $REPLICAS ]; then
    echo "✅ All $REPLICAS instances healthy"
    break
  fi
  echo "Waiting... ($i/30)"
  sleep 10
done

# 4. Verify load distribution
docker-compose logs api | tail -5

# 5. Monitor metrics
echo "Monitor: http://localhost:3001/d/nmd-dashboard"
```

**Verification:**
```bash
# Check all instances started
docker-compose ps api

# Verify load distribution
watch -n 5 'docker-compose logs --tail=20 api | grep "request from" | awk -F"instance" "{print $2}" | sort | uniq -c'

# Check error rate stayed stable
curl -s 'http://prometheus:9090/api/v1/query?query=rate(http_errors_total[5m])'
```

### 4.2 Database Scaling (30 minutes)

**When to Scale:**
```
IF active_connections > 16
   OR query_latency > 500ms
   THEN scale_database()
```

**Option A: Connection Pool Increase**
```bash
# 1. Update configuration
sed -i 's/DATABASE_POOL_MAX=20/DATABASE_POOL_MAX=30/' .env

# 2. Increase PostgreSQL limit
docker exec postgres psql -U postgres \
  -c "ALTER SYSTEM SET max_connections = 100;"

# 3. Reload configuration
docker exec postgres psql -U postgres -c "SELECT pg_reload_conf();"

# 4. Verify
docker exec postgres psql -U postgres -c "SHOW max_connections;"
```

**Option B: Add Read Replica**
```bash
# For read-heavy workloads (>80% reads)
# Update docker-compose.yml to add postgres-replica service
docker-compose up -d postgres-replica

# Update application to route reads to replica
# See Section 3 in COST_OPTIMIZATION.md for implementation
```

### 4.3 Deployment Process (30 minutes)

**Pre-deployment Checklist:**
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Database migrations backward-compatible
- [ ] Feature flags configured for rollout
- [ ] Monitoring dashboards updated
- [ ] Runbooks updated
- [ ] Team notified

**Deployment Steps:**

```bash
#!/bin/bash
# scripts/deploy-safe.sh

set -e

VERSION=$1  # e.g., v1.2.3

echo "Deploying NMD $VERSION to production..."

# 1. Pre-flight checks
echo "1. Running pre-flight checks..."
npm run test:unit
npm run test:integration
npm run lint

# 2. Build Docker image
echo "2. Building Docker image..."
docker build -t nmd-api:$VERSION .
docker tag nmd-api:$VERSION nmd-api:latest

# 3. Tag and push
echo "3. Pushing to registry..."
docker tag nmd-api:$VERSION registry.example.com/nmd-api:$VERSION
docker push registry.example.com/nmd-api:$VERSION

# 4. Backup current state
echo "4. Creating backup..."
scripts/backup-database.sh

# 5. Blue-green deployment
echo "5. Starting blue-green deployment..."

# Start new version (green) alongside old version (blue)
docker-compose up -d api-v$VERSION

# Wait for new version to be healthy
echo "6. Waiting for new version to be healthy..."
for i in {1..30}; do
  if curl -s http://localhost:3001/health | jq -e .status 2>/dev/null; then
    echo "✅ New version healthy"
    break
  fi
  sleep 10
done

# 7. Route traffic to new version
echo "7. Routing traffic to new version..."
docker exec load-balancer nginx -s reload

# 8. Smoke tests
echo "8. Running smoke tests..."
npm run test:smoke -- --base-url http://localhost:3000

# 9. Monitor for 5 minutes
echo "9. Monitoring new deployment (5 min)..."
sleep 300

# Check error rate
ERROR_RATE=$(curl -s 'http://prometheus:9090/api/v1/query?query=rate(http_errors_total[5m])' | jq '.data.result[0].value[1]')
if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
  echo "❌ Error rate too high ($ERROR_RATE), rolling back..."
  scripts/deploy-rollback.sh
  exit 1
fi

# 10. Remove old version
echo "10. Deployment successful, removing old version..."
docker-compose stop api
docker-compose rm -f api

echo "✅ Deployment complete!"
echo "Summary:"
echo "  Version: $VERSION"
echo "  Error rate: ${ERROR_RATE}%"
echo "  Status: SUCCESSFUL"
```

---

## Module 5: Incident Response (2 hours)

### 5.1 Incident Response Process

**Upon Alert:**

```
1. Acknowledge alert (in PagerDuty)
2. Follow runbook for specific scenario (see below)
3. If uncertain, page on-call manager
4. Update status page
5. Post-incident: document in retro
```

**Severity Levels:**

| Level | Examples | Response Time | Escalation |
|-------|----------|----------------|-----------|
| P1 (Critical) | Complete outage, data loss | <5 min | Page all on-call |
| P2 (High) | Major feature broken, significant degradation | <15 min | Page engineer |
| P3 (Medium) | Minor feature issue, slight latency increase | <1 hour | Create ticket |
| P4 (Low) | Cosmetic issue, minor slowdown | <24 hours | Create ticket |

### 5.2 Incident Runbooks

**Runbook: API Down**

```
Severity: P1 (Critical)
Detection: Health check failing
Expected impact: All users unable to access platform

Actions:
1. Check if API container is running
   docker-compose ps api
   
2. If not running, restart
   docker-compose restart api
   
3. Check logs for startup errors
   docker-compose logs api | head -50
   
4. If restart doesn't help:
   - Check database connectivity: docker-compose exec api psql $DATABASE_URL
   - Check Redis connectivity: docker-compose exec api redis-cli ping
   - Check disk space: df -h
   - Check memory: docker stats api
   
5. If still down, failover to secondary region
   scripts/failover-to-secondary.sh
   
6. Post recovery: collect logs and debug
   docker-compose logs api > /tmp/api-logs-$(date +%s).txt
```

**Runbook: High Error Rate (>5%)**

```
Severity: P2 (High)
Detection: Error rate alert firing
Expected impact: Users encountering failures

Actions:
1. Check error logs
   docker-compose logs api --since 10m | grep ERROR
   
2. Identify error pattern
   - Check for common errors (connection pool, OOM, etc.)
   
3. By error type:
   - Connection pool exhausted: Increase DATABASE_POOL_MAX and restart
   - Out of memory: Restart API (temporary), investigate memory leak
   - Database down: Check postgres status
   - Cache down: Restart Redis, warm cache
   
4. Monitor error rate
   Watch: http://localhost:3001/d/nmd-error-dashboard
   Target: Return to <0.5% within 10 minutes
   
5. If not improving, page on-call manager
```

**Runbook: Database Slow (Latency >1s)**

```
Severity: P2 (High)
Expected impact: Slow API responses, timeouts

Actions:
1. Check active queries
   docker exec postgres psql -U postgres -c "
   SELECT pid, query_start, query 
   FROM pg_stat_activity 
   WHERE state != 'idle' LIMIT 10;"
   
2. Identify long-running queries
   SELECT query, mean_time, calls 
   FROM pg_stat_statements 
   ORDER BY mean_time DESC LIMIT 5;
   
3. Solutions:
   - Kill long-running query: SELECT pg_terminate_backend(pid);
   - Optimize query: Add index or rewrite
   - Check for locks: SELECT * FROM pg_locks;
   
4. Add index if missing
   CREATE INDEX CONCURRENTLY idx_name ON table(column);
   
5. Monitor latency recovery
   Target: Return to <100ms p95 within 15 minutes
```

**Runbook: High Memory Usage (>85%)**

```
Severity: P1 if sustained (Critical)
Expected impact: Process crash/OOM

Actions:
1. Check current memory
   docker stats api
   
2. Check for memory leak
   docker-compose logs api | grep -i "memory\|gc\|leak"
   
3. Identify large objects
   - Recent cache additions?
   - Recent data fetch without pagination?
   - Event listeners not cleaned up?
   
4. Immediate action: Restart
   docker-compose restart api
   
5. Monitor for recurrence
   If memory grows again: Investigate root cause
   
6. Temporary workaround: Increase container memory
   docker-compose.yml: memory: 3G (was 2G)
   
7. Schedule permanent fix: Code review for leaks
```

### 5.3 Post-Incident Review (30 minutes)

**Incident Review Template:**

```markdown
# Incident Review: [Service Name]

**Date:** [Date]
**Duration:** [Time down] minutes
**Severity:** P[1-4]
**Impact:** [Number] users affected

## Timeline
- 14:32 - Alert fired
- 14:35 - On-call responded
- 14:42 - Root cause identified (...)
- 14:48 - Service restored
- 15:00 - Monitoring confirmed stable

## Root Cause
[Description of what went wrong]

## Contributing Factors
- [Factor 1]
- [Factor 2]

## Resolution
[What was done to fix]

## Follow-up Actions
- [ ] Code fix: [PR link]
- [ ] Test coverage: Add test for this scenario
- [ ] Documentation: Update runbook
- [ ] Process improvement: [Action]

## Prevention
[How to prevent this in future]

## Learnings
[What we learned]
```

---

## Module 6: Quick Reference

### Command Cheat Sheet

```bash
# Health checks
make health-check
curl http://localhost:3000/health

# Logs
docker-compose logs -f api
docker-compose logs postgres
make logs-api

# Database
make db-shell
docker exec postgres psql -U postgres -d nmd_platform

# Cache
docker-compose exec redis redis-cli
docker-compose exec redis redis-cli FLUSHDB  # Clear cache

# Metrics
make prometheus-shell  # Access http://localhost:9091
make grafana-shell     # Access http://localhost:3001

# Scaling
docker-compose up -d --scale api=5  # Scale to 5 instances

# Deployment
make validate
make deploy-staging
make deploy-prod  # Requires confirmation

# Troubleshooting
docker-compose logs api --since 1h | grep ERROR
docker stats  # Real-time resource usage
df -h        # Disk usage
```

### On-Call Escalation

```
Tier 1 (You):
- Execute runbooks
- Communicate status
- Gather logs and metrics

Tier 2 (Engineering Manager):
- Senior engineer judgment
- Architecture decisions
- External communication

Tier 3 (VP Engineering):
- Business impact assessment
- Major decisions
- External parties
```

**Escalation Number:** +1-555-NMD-911

---

## Training Completion Checklist

Before operating in production, verify:

- [ ] Completed Module 1: Foundation (understood architecture)
- [ ] Completed Module 2: Daily Operations (can perform health checks)
- [ ] Completed Module 3: Troubleshooting (can diagnose common issues)
- [ ] Completed Module 4: Scaling (can scale infrastructure)
- [ ] Completed Module 5: Incident Response (can respond to alerts)
- [ ] Shadowed experienced engineer for 1 week
- [ ] Handled at least 1 P2 incident with supervision
- [ ] Passed knowledge assessment (90%+)

**Assessment Questions:**
1. What are the 17 core modules?
2. How do you scale the API horizontally?
3. What's the max database connections and when do you scale?
4. Walk through the incident response process
5. Debug a "connection pool exhausted" error
6. Explain multi-tenancy and isolation
7. What are the rate limiting thresholds?
8. How do you deploy safely with blue-green?

---

## Continuous Learning

**Monthly Training:**
- [ ] Review 1 incident from previous month
- [ ] Update runbooks based on learnings
- [ ] Read 1 architectural document

**Quarterly Training:**
- [ ] Disaster recovery drill (full team)
- [ ] Scaling capacity test
- [ ] Architecture review session

**Annual Training:**
- [ ] Full team training refresh
- [ ] New tooling/processes introduction
- [ ] Cross-training with other teams

---

**Document Version:** 1.0
**Last Updated:** 2024-07-31
**Owner:** Platform Engineering Team
**Next Review:** 2024-10-31 (Quarterly)

**Resources:**
- Architecture diagram: docs/ARCHITECTURE.md
- API documentation: docs/API.md
- Quick start: QUICKSTART.md
- Disaster recovery: DISASTER_RECOVERY.md
- Deployment guide: README.md
