# RUNBOOKS.md

## Overview

This document provides step-by-step procedures for common operational tasks. Use this as your quick reference when responding to alerts or performing routine maintenance.

**Quick Navigation:**
- [Scaling Operations](#scaling-operations)
- [Incident Response](#incident-response)
- [Deployment Operations](#deployment-operations)
- [Database Operations](#database-operations)
- [Cache Operations](#cache-operations)
- [Troubleshooting](#troubleshooting)

---

## Scaling Operations

### Runbook: Scale API Horizontally (Add Instances)

**When to use:** Request rate >1000 req/s, CPU >75%, latency increasing

**Estimated time:** 10 minutes

**Steps:**

```bash
# 1. Check current load
echo "Current request rate:"
curl -s 'http://prometheus:9090/api/v1/query?query=rate(http_requests_total[1m])' | jq '.data.result[0].value[1]'

# 2. Update docker-compose.yml
sed -i 's/replicas: 3/replicas: 4/' docker-compose.yml

# 3. Bring up new instances
docker-compose up -d api

# 4. Wait for health checks (2-3 minutes)
echo "Waiting for instances to become healthy..."
watch -n 5 'docker-compose ps api | grep healthy | wc -l'
# Should show: 4

# 5. Verify load distribution
docker-compose logs api --tail=100 | grep "request from" | awk -F"instance" '{print $2}' | sort | uniq -c
# Should show roughly even distribution across 4 instances

# 6. Monitor error rate
curl -s 'http://prometheus:9090/api/v1/query?query=rate(http_errors_total[5m])' | jq '.data.result[0].value[1]'
# Should remain <0.5%

# 7. Confirm latency stable
curl -s 'http://prometheus:9090/api/v1/query?query=histogram_quantile(0.95,http_request_duration_ms_bucket)' | jq '.data.result[0].value[1]'
# Should be <150ms

echo "✅ Scaling complete - API now running 4 instances"
```

**Rollback if issues:**
```bash
# Scale back down
sed -i 's/replicas: 4/replicas: 3/' docker-compose.yml
docker-compose up -d api
docker-compose down $(docker-compose ps -q api | tail -1)
```

---

### Runbook: Scale Database Connection Pool

**When to use:** Database connections >16/20, connection pool warnings

**Estimated time:** 5 minutes

**Steps:**

```bash
# 1. Check current connections
docker exec postgres psql -U postgres -c "SELECT COUNT(*) FROM pg_stat_activity;"

# 2. Update .env
sed -i 's/DATABASE_POOL_MAX=20/DATABASE_POOL_MAX=30/' .env

# 3. Update PostgreSQL config
docker exec postgres psql -U postgres -c "ALTER SYSTEM SET max_connections = 100;"
docker exec postgres psql -U postgres -c "SELECT pg_reload_conf();"

# 4. Verify changes
docker exec postgres psql -U postgres -c "SHOW max_connections;"

# 5. Restart API to use new pool size
docker-compose restart api

# 6. Monitor connection usage
echo "Monitoring connections for 5 minutes..."
for i in {1..30}; do
  COUNT=$(docker exec postgres psql -U postgres -c "SELECT COUNT(*) FROM pg_stat_activity;" | tail -1)
  echo "[$i/30] Connections: $COUNT"
  sleep 10
done

echo "✅ Pool scaled to 30 connections"
```

---

### Runbook: Increase Redis Memory

**When to use:** Redis memory >1.5GB/2GB, eviction warnings

**Estimated time:** 10 minutes

**Steps:**

```bash
# 1. Check current memory
docker-compose exec redis redis-cli INFO memory | grep used_memory_human

# 2. Check eviction count
docker-compose exec redis redis-cli INFO stats | grep evicted_keys

# 3. Update docker-compose.yml
# Change: memory: 2G to memory: 4G
sed -i 's/memory: 2G/memory: 4G/' docker-compose.yml

# 4. Restart Redis (brief outage expected)
docker-compose restart redis

# 5. Wait for recovery (1-2 minutes)
watch -n 5 'docker-compose exec redis redis-cli PING'
# Should return: PONG

# 6. Verify size
docker-compose exec redis redis-cli INFO memory | grep maxmemory

# 7. Monitor hit rate recovery
echo "Cache hit rate recovering..."
watch -n 5 'curl -s "http://prometheus:9090/api/v1/query?query=redis_hits%2F(redis_hits%2Bredis_misses)" | jq ".data.result[0].value[1]"'
# Should return to >70% within 5 minutes

echo "✅ Redis memory increased to 4GB"
```

---

## Incident Response

### Runbook: API Unresponsive or Crashing

**Severity:** P1 (Critical)
**Estimated time:** 10 minutes

**Steps:**

```bash
# 1. IMMEDIATE: Check if API is running
docker-compose ps api
# If status is "Exit(1)", go to step 3

# 2. Check recent logs for errors
docker-compose logs api --tail=50 | tail -30

# 3. Restart API service
echo "Restarting API..."
docker-compose restart api

# 4. Wait for health check (2 minutes)
watch -n 5 'curl -s http://localhost:3000/health | jq .status'
# Should return: "healthy"

# 5. If restart didn't help, investigate further
# Check disk space
df -h | grep -E "/$|/var"
# Should have >5GB available

# Check memory
docker stats api
# If memory high (>90%), look for memory leak

# 6. If database connectivity issue
docker exec api psql $DATABASE_URL -c "SELECT 1;"
# Should return: 1

# 7. If Redis connectivity issue
docker exec api redis-cli -h redis ping
# Should return: PONG

# 8. If still down, check for panics
docker-compose logs api | grep -i "panic"

# 9. If multiple restart attempts fail, failover to secondary
scripts/failover-to-secondary.sh

echo "✅ API recovered (or failover initiated)"
```

---

### Runbook: High Error Rate (>5%)

**Severity:** P2 (High)
**Estimated time:** 15 minutes

**Steps:**

```bash
# 1. Verify error rate
curl -s 'http://prometheus:9090/api/v1/query?query=rate(http_errors_total[5m])%2Frate(http_requests_total[5m])*100' | jq '.data.result[0].value[1]'

# 2. Identify error type
echo "Error breakdown:"
docker-compose logs api --since 5m | grep "ERROR" | \
  sed 's/.*ERROR: \([^:]*\).*/\1/' | sort | uniq -c | sort -rn | head -10

# 3. By error type:

# If "Connection refused" → Database/Redis down
docker-compose ps postgres redis
docker-compose restart postgres redis

# If "Out of memory" → API memory limit hit
docker-compose exec api ps aux | grep node
# Increase memory in docker-compose.yml
docker-compose up -d api

# If "Timeout" → Database slow
docker exec postgres psql -U postgres -c "
  SELECT query, mean_time, calls FROM pg_stat_statements 
  ORDER BY mean_time DESC LIMIT 5;"
# Add indexes or optimize queries

# If "Connection pool exhausted" → Too many connections
docker exec postgres psql -U postgres -c "SELECT COUNT(*) FROM pg_stat_activity;"
# Increase DATABASE_POOL_MAX (see scaling runbook)

# If "Rate limit exceeded" → Expected under heavy load
# This is normal, errors should be <1% if legitimate traffic

# 4. Monitor error rate recovery
echo "Monitoring error rate (target: <0.5%)..."
for i in {1..30}; do
  RATE=$(curl -s 'http://prometheus:9090/api/v1/query?query=rate(http_errors_total[5m])%2Frate(http_requests_total[5m])*100' | jq '.data.result[0].value[1]')
  echo "[$i/30] Error rate: ${RATE}%"
  if (( $(echo "$RATE < 0.5" | bc -l) )); then
    echo "✅ Error rate recovered"
    break
  fi
  sleep 30
done

# If still high after 30 minutes, escalate to engineering manager
```

---

### Runbook: Database Slow (Latency >500ms)

**Severity:** P2 (High)
**Estimated time:** 20 minutes

**Steps:**

```bash
# 1. Confirm latency
curl -s 'http://prometheus:9090/api/v1/query?query=histogram_quantile(0.95,http_request_duration_ms_bucket)' | jq '.data.result[0].value[1]'

# 2. Check active queries
docker exec postgres psql -U postgres -c "
  SELECT pid, usename, query_start, query 
  FROM pg_stat_activity 
  WHERE state != 'idle' LIMIT 10;"

# 3. Look for long-running queries
docker exec postgres psql -U postgres -c "
  SELECT pid, query_start, query 
  FROM pg_stat_activity 
  WHERE query_start < NOW() - INTERVAL '5 minutes';"

# 4. Kill long-running query if safe
# docker exec postgres psql -U postgres -c "SELECT pg_terminate_backend(12345);"  # Use actual PID

# 5. Check for slow queries log
docker exec postgres tail -20 /var/log/postgresql/postgresql.log | grep "duration:"

# 6. Identify missing indexes
docker exec postgres psql -U postgres -c "
  SELECT schemaname, tablename, indexname 
  FROM pg_indexes 
  WHERE schemaname = 'public' 
  ORDER BY tablename;"

# 7. Add index if missing
# Example:
# docker exec postgres psql -U postgres -c "
# CREATE INDEX CONCURRENTLY idx_content_org_status 
# ON content(organization_id, status);"

# 8. Check for table bloat
docker exec postgres psql -U postgres -c "
  SELECT schemaname, tablename, 
  ROUND(pg_total_relation_size(schemaname||'.'||tablename) / 1024 / 1024) as size_mb
  FROM pg_tables 
  WHERE schemaname = 'public' 
  ORDER BY size_mb DESC LIMIT 10;"

# 9. Vacuum if large table
# docker exec postgres psql -U postgres -c "VACUUM ANALYZE content;"

# 10. Monitor latency recovery
echo "Monitoring p95 latency (target: <100ms)..."
watch -n 10 'curl -s "http://prometheus:9090/api/v1/query?query=histogram_quantile(0.95,http_request_duration_ms_bucket)" | jq ".data.result[0].value[1]"'

echo "✅ Database performance optimized"
```

---

### Runbook: Disk Full (>90%)

**Severity:** P1 (Critical)
**Estimated time:** 30 minutes

**Steps:**

```bash
# 1. Check disk usage
df -h | grep -E "/$|/var"

# 2. Find largest files/directories
du -sh /* | sort -rh | head -20

# 3. Clean options (in order):

# A. Clean old logs
find /var/log -name "*.log" -mtime +30 -delete
find /var/lib/docker/containers -name "*.log" -delete

# B. Clean Docker
docker system prune -a --volumes
docker volume prune

# C. Archive old backups
mkdir -p /archive
mv /backups/full/*$(date -d '30 days ago' +%Y%m%d)* /archive/

# D. Archive PostgreSQL logs
tar -czf /archive/pg-logs-$(date +%Y%m%d).tar.gz /var/log/postgresql/
rm /var/log/postgresql/*.log

# E. Truncate PostgreSQL logs
sudo truncate -s 0 /var/log/postgresql/*.log

# 4. Verify space freed
df -h | grep -E "/$|/var"
# Should be <80%

# 5. If still >80%, notify infrastructure team
# May need to extend volume in cloud provider
aws ec2 describe-volumes --volume-ids vol-xxx  # Get volume size
aws ec2 modify-volume --volume-id vol-xxx --size 1000  # Extend to 1TB

# 6. If emergency cleanup needed:
# - Archive and delete content older than 1 year (carefully)
# - Stop API temporarily
# - Run aggressive cleanup

docker-compose stop api

# Delete old data (CAREFUL - verify first)
docker exec postgres psql -U postgres -d nmd_platform -c "
  DELETE FROM content 
  WHERE created_at < NOW() - INTERVAL '1 year' 
  AND archived = true;"

docker-compose start api

echo "✅ Disk space recovered"
```

---

## Deployment Operations

### Runbook: Safe Deployment with Rollback

**Estimated time:** 15-20 minutes

**Steps:**

```bash
# 1. Pre-deployment checks
echo "Running pre-deployment checks..."
npm run test:unit || exit 1
npm run test:integration || exit 1
npm run lint || exit 1

# 2. Build Docker image
VERSION="1.2.3"  # Use semantic versioning
docker build -t nmd-api:$VERSION .
docker tag nmd-api:$VERSION nmd-api:latest

# 3. Create backup before deployment
echo "Creating backup..."
docker exec postgres pg_dump -U postgres nmd_platform > /tmp/backup-before-$VERSION.sql
docker exec redis redis-cli BGSAVE
sleep 2

# 4. Tag current running version as backup
CURRENT_IMAGE=$(docker inspect nmd-api | jq -r '.[0].RepoTags[0]')
echo "Current version: $CURRENT_IMAGE"
docker tag $CURRENT_IMAGE nmd-api:previous

# 5. Deploy new version (blue-green)
echo "Starting new version..."
docker run -d --name api-new \
  -e DATABASE_URL=$DATABASE_URL \
  -e REDIS_URL=$REDIS_URL \
  -p 3001:3000 \
  nmd-api:$VERSION

# 6. Wait for startup (30-60 seconds)
echo "Waiting for new instance to become healthy..."
for i in {1..30}; do
  if curl -s http://localhost:3001/health | jq -e .status > /dev/null; then
    echo "✅ New instance healthy"
    break
  fi
  echo "Waiting... [$i/30]"
  sleep 2
done

# 7. Run smoke tests
echo "Running smoke tests..."
npm run test:smoke -- --base-url http://localhost:3001 || {
  echo "❌ Smoke tests failed, rolling back..."
  docker stop api-new
  docker rm api-new
  exit 1
}

# 8. Switch traffic (update load balancer)
# This depends on your load balancer setup
# Example for nginx:
sed -i 's/3000/3001/g' /etc/nginx/nginx.conf
nginx -s reload

# 9. Monitor new deployment (5 minutes)
echo "Monitoring new deployment..."
for i in {1..30}; do
  ERROR_RATE=$(curl -s 'http://prometheus:9090/api/v1/query?query=rate(http_errors_total[1m])%2Frate(http_requests_total[1m])*100' | jq '.data.result[0].value[1] // 0')
  echo "[$i/30] Error rate: ${ERROR_RATE}%"
  
  if (( $(echo "$ERROR_RATE > 1" | bc -l) )); then
    echo "❌ Error rate too high, rolling back..."
    docker stop api-new
    docker rm api-new
    sed -i 's/3001/3000/g' /etc/nginx/nginx.conf
    nginx -s reload
    exit 1
  fi
  sleep 10
done

# 10. Cleanup old instance
docker stop api
docker rm api
docker tag nmd-api:$VERSION nmd-api:latest

echo "✅ Deployment successful!"
echo "Version: $VERSION"
echo "Rollback image: nmd-api:previous"
```

---

## Database Operations

### Runbook: Backup and Restore

**Create backup:**
```bash
# Full database backup
docker exec postgres pg_dump -U postgres nmd_platform | gzip > backup-$(date +%Y%m%d_%H%M%S).sql.gz

# Upload to S3
aws s3 cp backup-*.sql.gz s3://nmd-backups/manual/

# Verify backup
gunzip -c backup-*.sql.gz | head -20
```

**Restore from backup:**
```bash
# 1. Stop API to prevent writes
docker-compose stop api

# 2. Download backup
aws s3 cp s3://nmd-backups/manual/backup-20240731_120000.sql.gz /tmp/

# 3. Decompress
gunzip /tmp/backup-20240731_120000.sql.gz

# 4. Create new database (optional)
docker exec postgres psql -U postgres -c "DROP DATABASE nmd_platform;"
docker exec postgres psql -U postgres -c "CREATE DATABASE nmd_platform;"

# 5. Restore
cat /tmp/backup-20240731_120000.sql | docker exec -i $(docker ps -qf "name=postgres") psql -U postgres nmd_platform

# 6. Verify restore
docker exec postgres psql -U postgres nmd_platform -c "SELECT COUNT(*) FROM content;"

# 7. Start API
docker-compose start api

echo "✅ Database restored"
```

---

## Cache Operations

### Runbook: Clear and Warm Cache

**Clear cache (use with caution):**
```bash
# Clear specific key
docker-compose exec redis redis-cli DEL "template:5"

# Clear by pattern
docker-compose exec redis redis-cli --scan --pattern "content:*" | xargs -L 100 docker-compose exec -T redis redis-cli DEL

# Clear entire cache (WARNING: impacts performance)
docker-compose exec redis redis-cli FLUSHDB

# Verify cleared
docker-compose exec redis redis-cli DBSIZE
# Should show: (integer) 0
```

**Warm cache:**
```bash
# Rebuild cache from database
curl -X POST http://localhost:3000/api/internal/cache-warmup \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tables": ["templates", "content", "settings"],
    "ttl": 86400
  }'

# Monitor cache recovery
echo "Monitoring cache hit rate..."
watch -n 5 'curl -s "http://prometheus:9090/api/v1/query?query=redis_hits%2F(redis_hits%2Bredis_misses)*100" | jq ".data.result[0].value[1]"'
# Should recover to 70%+ within 5 minutes

echo "✅ Cache warmed"
```

---

## Troubleshooting

### Quick Diagnosis Decision Tree

```
SYMPTOM: Complete outage
├─ API not responding → Check if running: docker-compose ps api
├─ Database down → Check: docker-compose ps postgres
├─ Network issue → Check: docker network ls, curl localhost
└─ Everything down → Failover to secondary: scripts/failover-to-secondary.sh

SYMPTOM: Slow responses
├─ High latency → Check p95: curl prometheus/api/v1/query
├─ High CPU → Scale compute (see scaling runbook)
├─ High memory → Find memory leak or increase size
├─ Database slow → Add indexes (see database runbook)
└─ Cache hit rate low → Warm cache (see cache runbook)

SYMPTOM: High error rate
├─ 5xx errors → Check logs: docker-compose logs api --since 10m
├─ 4xx errors → Client issue, likely not your fault
├─ Rate limited (429) → Normal under high load
├─ Connection errors → Database/Redis connectivity issue
└─ Timeout errors → Upstream service slow

SYMPTOM: Disk full
├─ Log files → Clean old logs (see disk full runbook)
├─ Backups → Archive old backups
├─ Docker → Run docker system prune
└─ Database → Check for bloat or old data
```

### Emergency Contacts

```
On-Call Engineer: @on-call in Slack
On-Call Manager: +1-555-NMD-911 option 1
Security Team: #security-incidents
CTO: #cto-escalations
```

---

**Document Version:** 1.0
**Last Updated:** 2024-07-31
**Owner:** Operations Team

**Usage Tips:**
- Bookmark this page
- Update with your actual values (IPs, tokens, etc.)
- Practice runbooks quarterly
- Update after every incident
- Share learnings with team
