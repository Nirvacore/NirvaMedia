# MONITORING_GUIDE.md

## Overview

This guide provides comprehensive monitoring and observability setup for the NMD Platform. It covers Prometheus metrics, Grafana dashboards, alerting strategies, and advanced troubleshooting using monitoring data.

**Monitoring Stack:**
- **Metrics:** Prometheus (40+ metrics, 15-second scrape interval)
- **Visualization:** Grafana (15+ dashboards, 3,000+ data points/second)
- **Alerting:** AlertManager (40+ rules, multi-channel notifications)
- **Logging:** Docker logs + ELK stack (optional)
- **Tracing:** Jaeger (optional, for distributed tracing)

**Current Coverage:**
- ✅ API metrics (requests, latency, errors)
- ✅ Database metrics (connections, queries, replication)
- ✅ Cache metrics (hit rate, memory, evictions)
- ✅ System metrics (CPU, memory, disk, network)
- ✅ Application metrics (events, business metrics)

---

## 1. Prometheus Setup

### 1.1 Prometheus Configuration

**Location:** `monitoring/prometheus.yml`

```yaml
global:
  scrape_interval: 15s      # Scrape every 15 seconds
  evaluation_interval: 15s  # Evaluate rules every 15 seconds
  external_labels:
    cluster: 'production'
    environment: 'prod'

scrape_configs:
  # API Metrics
  - job_name: 'api'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 15s
    scrape_timeout: 10s
  
  # Database Metrics (via postgres_exporter)
  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:9187']
    scrape_interval: 30s  # Less frequent than API
  
  # Redis Metrics (via redis_exporter)
  - job_name: 'redis'
    static_configs:
      - targets: ['localhost:9121']
    scrape_interval: 30s
  
  # Node Metrics (via node_exporter)
  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']
    scrape_interval: 60s  # System metrics less frequent
  
  # Docker Metrics (via cAdvisor)
  - job_name: 'docker'
    static_configs:
      - targets: ['localhost:8080']
    scrape_interval: 30s

rule_files:
  - 'alerts.yml'

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']
```

### 1.2 Metric Types

**Counter** (only increases):
```
http_requests_total{path="/api/content", status="200"}
# Use: Total count, rates with rate()
```

**Gauge** (can go up/down):
```
pg_stat_activity_count
# Use: Current value, current state
```

**Histogram** (distribution):
```
http_request_duration_ms_bucket{le="100"}
http_request_duration_ms_bucket{le="500"}
# Use: Percentiles with histogram_quantile()
```

**Summary** (similar to histogram):
```
process_resident_memory_bytes
# Use: Quantiles without buckets
```

### 1.3 Custom Metrics Implementation

**Add metrics to your Node.js application:**

```typescript
// src/monitoring/metrics.ts
import promClient from 'prom-client';

// Create register for metrics
const register = new promClient.Registry();

// Counter: API requests
export const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [register],
});

// Gauge: Current connections
export const dbConnectionsActive = new promClient.Gauge({
  name: 'db_connections_active',
  help: 'Active database connections',
  registers: [register],
});

// Histogram: Request duration
export const httpRequestDurationMs = new promClient.Histogram({
  name: 'http_request_duration_ms',
  help: 'HTTP request duration in milliseconds',
  labelNames: ['method', 'path'],
  buckets: [10, 30, 50, 100, 200, 500, 1000, 2000],
  registers: [register],
});

// Business metrics
export const contentPublishedTotal = new promClient.Counter({
  name: 'content_published_total',
  help: 'Total content published',
  labelNames: ['organization_id', 'content_type'],
  registers: [register],
});

// Export metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
});
```

**Middleware to record metrics:**

```typescript
// Record every request
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    httpRequestsTotal
      .labels(req.method, req.path, res.statusCode)
      .inc();
    
    httpRequestDurationMs
      .labels(req.method, req.path)
      .observe(duration);
  });
  
  next();
});

// Record business metrics
app.post('/api/content/publish', (req, res) => {
  // ... business logic ...
  
  contentPublishedTotal
    .labels(req.user.organizationId, req.body.type)
    .inc();
    
  res.json({ success: true });
});
```

---

## 2. Grafana Dashboards

### 2.1 Access Grafana

```
URL: http://localhost:3001
Username: admin
Password: admin (CHANGE ON FIRST LOGIN!)
```

**First-time Setup:**
```bash
# 1. Change admin password
# Login → Profile → Change Password

# 2. Add Prometheus data source
# Configuration → Data Sources → Add → Prometheus
# URL: http://prometheus:9090

# 3. Import pre-built dashboards
# Create → Import → Paste dashboard ID
# Available IDs: 1, 3, 6, 11441 (community dashboards)
```

### 2.2 Key Dashboards

**Dashboard 1: API Performance**

Panels:
```
1. Request Rate (req/s)
   Query: rate(http_requests_total[1m])
   Alert: Warn >1000, Critical >1200

2. Error Rate (%)
   Query: rate(http_errors_total[5m]) / rate(http_requests_total[5m]) * 100
   Alert: Warn >0.5%, Critical >1%

3. Response Time (p95, p99)
   Query: histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m]))
   Alert: Warn >100ms, Critical >200ms

4. Concurrent Requests
   Query: rate(http_requests_total[1m]) / rate(http_request_duration_ms_sum[1m]) * 1000
   Alert: Warn >500, Critical >1000

5. Requests by Status Code
   Query: rate(http_requests_total[5m]) by (status)
   Type: Pie chart

6. Top 10 Endpoints by Traffic
   Query: topk(10, sum by (path) (rate(http_requests_total[5m])))
   Type: Table
```

**Dashboard 2: Database Health**

Panels:
```
1. Active Connections
   Query: pg_stat_activity_count
   Alert: Warn >16, Critical >19

2. Connection Pool Usage (%)
   Query: pg_stat_activity_count / 20 * 100
   Alert: Warn >80%, Critical >95%

3. Query Latency (ms)
   Query: histogram_quantile(0.95, pg_slow_queries_duration_ms_bucket)
   Alert: Warn >500ms, Critical >1000ms

4. Slow Queries (>1s)
   Query: count(pg_slow_queries_total)
   Alert: Warn >10, Critical >50

5. Database Disk Usage (%)
   Query: (node_filesystem_size_bytes - node_filesystem_avail_bytes) / node_filesystem_size_bytes * 100
   Alert: Warn >80%, Critical >90%

6. Replication Lag (seconds)
   Query: pg_replication_lag_seconds
   Alert: Critical >60s
```

**Dashboard 3: Cache Health**

Panels:
```
1. Cache Hit Rate (%)
   Query: redis_hits / (redis_hits + redis_misses) * 100
   Alert: Warn <50%, Critical <30%

2. Cache Memory Usage (%)
   Query: redis_memory_used_bytes / 2147483648 * 100  # 2GB max
   Alert: Warn >80%, Critical >95%

3. Cache Evictions (per minute)
   Query: rate(redis_evicted_keys_total[1m])
   Alert: Warn >100/min, Critical >500/min

4. Expired Keys (per minute)
   Query: rate(redis_expired_keys_total[1m])
   Alert: Warn >1000/min

5. Connected Clients
   Query: redis_connected_clients
   Alert: Critical >1000

6. Commands/sec
   Query: rate(redis_commands_processed_total[1m])
   Alert: Warn >10000, Critical >50000
```

**Dashboard 4: System Health**

Panels:
```
1. CPU Usage (%)
   Query: (1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m]))) * 100
   Alert: Warn >75%, Critical >85%

2. Memory Usage (%)
   Query: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100
   Alert: Warn >75%, Critical >85%

3. Disk Usage (%)
   Query: (node_filesystem_size_bytes - node_filesystem_avail_bytes) / node_filesystem_size_bytes * 100
   Alert: Warn >80%, Critical >90%

4. Network I/O
   Query: rate(node_network_receive_bytes_total[1m]), rate(node_network_transmit_bytes_total[1m])
   Type: Graph

5. Disk I/O
   Query: rate(node_disk_read_bytes_total[1m]), rate(node_disk_written_bytes_total[1m])
   Type: Graph

6. Load Average
   Query: node_load1, node_load5, node_load15
   Alert: Warn >cores*0.8, Critical >cores
```

### 2.3 Creating Custom Dashboards

**Step-by-step:**

1. Click "Create" → "Dashboard"
2. Add panel:
   - Click "Add a new panel"
   - Metrics query (use Prometheus query syntax)
   - Visualization type (Graph, Gauge, Stat, Table, etc.)
   - Set thresholds for alerts
3. Configure alerts:
   - Alert tab → New alert rule
   - Set condition (e.g., value > 100)
   - Set notification channel
4. Save dashboard with descriptive name

---

## 3. Alerting

### 3.1 Alert Rules Configuration

**Location:** `monitoring/alerts.yml`

```yaml
groups:
  - name: api_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: |
          (sum(rate(http_errors_total[5m])) / 
           sum(rate(http_requests_total[5m]))) * 100 > 5
        for: 5m
        labels:
          severity: critical
          component: api
        annotations:
          summary: "High error rate: {{ $value }}%"
          description: "Error rate exceeded 5% for 5 minutes"
          runbook: "docs/runbooks/high-error-rate.md"
      
      - alert: HighLatency
        expr: histogram_quantile(0.95, http_request_duration_ms_bucket) > 500
        for: 5m
        labels:
          severity: warning
          component: api
        annotations:
          summary: "High latency: {{ $value }}ms p95"
          runbook: "docs/runbooks/high-latency.md"
  
  - name: database_alerts
    interval: 30s
    rules:
      - alert: DatabaseDown
        expr: up{job="postgres"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "PostgreSQL is down"
          runbook: "docs/runbooks/database-down.md"
      
      - alert: ConnectionPoolExhausted
        expr: pg_stat_activity_count > 19
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "DB connections: {{ $value }}/20"
          runbook: "docs/runbooks/pool-exhausted.md"
      
      - alert: SlowQueries
        expr: count(pg_slow_queries_total > 1000) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "{{ $value }} queries > 1s detected"
          runbook: "docs/runbooks/slow-queries.md"
  
  - name: cache_alerts
    interval: 30s
    rules:
      - alert: RedisDown
        expr: up{job="redis"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis cache is down"
          runbook: "docs/runbooks/redis-down.md"
      
      - alert: LowCacheHitRate
        expr: (redis_hits / (redis_hits + redis_misses)) < 0.5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Cache hit rate: {{ $value }}%"
          runbook: "docs/runbooks/low-hit-rate.md"
  
  - name: system_alerts
    interval: 30s
    rules:
      - alert: HighCPUUsage
        expr: (1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m]))) * 100 > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "CPU usage: {{ $value }}%"
      
      - alert: DiskFull
        expr: (node_filesystem_size_bytes - node_filesystem_avail_bytes) / node_filesystem_size_bytes * 100 > 90
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Disk usage: {{ $value }}%"
          runbook: "docs/runbooks/disk-full.md"
```

### 3.2 AlertManager Configuration

**Location:** `monitoring/alertmanager.yml`

```yaml
global:
  resolve_timeout: 5m
  slack_api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
  pagerduty_url: 'https://events.pagerduty.com/v2/enqueue'

route:
  receiver: 'default'
  group_by: ['alertname', 'cluster']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  
  routes:
    # Critical alerts: immediate escalation
    - match:
        severity: critical
      receiver: 'pagerduty'
      group_wait: 0s
      repeat_interval: 1h
    
    # Warnings: Slack only
    - match:
        severity: warning
      receiver: 'slack-warnings'
      group_wait: 5m

receivers:
  - name: 'default'
    slack_configs:
      - channel: '#monitoring'
        title: 'Alert: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
  
  - name: 'slack-warnings'
    slack_configs:
      - channel: '#monitoring-warnings'
        title: 'Warning: {{ .GroupLabels.alertname }}'
        text: '{{ .Annotations.summary }}'
  
  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_KEY'
        description: '{{ .GroupLabels.alertname }} - {{ .Alerts | len }} alerts'
        details:
          fire: '{{ range .Alerts.Firing }}{{ .Annotations.summary }} {{ end }}'
          resolve: '{{ range .Alerts.Resolved }}{{ .Annotations.summary }} {{ end }}'

inhibit_rules:
  # Ignore warnings if critical alert exists
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'dev', 'instance']
```

---

## 4. Logging & Log Analysis

### 4.1 Log Aggregation

**Structured Logging:**

```typescript
// Use structured logging for better analysis
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',  // Pretty print in dev
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  }
});

// Log with context
logger.info({
  event: 'content_published',
  userId: req.user.id,
  organizationId: req.user.organizationId,
  contentId: content.id,
  duration: Date.now() - startTime,
}, 'Content published successfully');

// Log errors with stack trace
logger.error({
  event: 'database_error',
  error: err.message,
  stack: err.stack,
  query: 'SELECT * FROM content...',
}, 'Database query failed');
```

**Log Levels:**
```
FATAL (60): Application is unusable
ERROR (50): Error occurred but app continues
WARN  (40): Warning condition detected
INFO  (30): Informational message
DEBUG (20): Debug information
TRACE (10): Very detailed trace information
```

### 4.2 Log Analysis Queries

**Find errors by type:**
```bash
docker-compose logs api --since 1h | grep -i error | sort | uniq -c | sort -rn
```

**Find slow requests:**
```bash
docker-compose logs api --since 1h | grep "duration" | awk -F'duration:' '{print $2}' | sort -rn | head -20
```

**Find authentication failures:**
```bash
docker-compose logs api --since 1h | grep -i "auth\|unauthorized\|401"
```

**Monitor in real-time:**
```bash
docker-compose logs -f api | grep -E "ERROR|WARN|duration"
```

---

## 5. Advanced Monitoring Topics

### 5.1 Distributed Tracing (Jaeger)

**Setup (Optional):**

```yaml
# docker-compose.yml
jaeger:
  image: jaegertracing/all-in-one:latest
  ports:
    - "6831:6831/udp"  # Jaeger agent
    - "16686:16686"    # Jaeger UI
  environment:
    COLLECTOR_ZIPKIN_HOST_PORT: ":9411"
```

**Instrument application:**

```typescript
import { initTracing } from 'jaeger-client';

const initJaeger = (serviceName) => {
  const options = {
    serviceName: serviceName,
    sampler: {
      type: 'const',
      param: 1,
    },
    reporter: {
      logSpans: true,
      agentHost: 'localhost',
      agentPort: 6831,
    },
  };

  return initTracing(options);
};

const tracer = initJaeger('nmd-api');

// Use tracer
const span = tracer.startSpan('get-content');
span.setTag('content_id', contentId);
// ... business logic ...
span.finish();
```

**Access Jaeger UI:** http://localhost:16686

### 5.2 Custom Metrics for Business Intelligence

```typescript
// Track business events
export const contentMetrics = {
  published: new promClient.Counter({
    name: 'content_published_total',
    labelNames: ['organization_id', 'type'],
  }),
  
  views: new promClient.Counter({
    name: 'content_views_total',
    labelNames: ['organization_id', 'content_id'],
  }),
  
  engagementRate: new promClient.Gauge({
    name: 'content_engagement_rate',
    labelNames: ['organization_id'],
  }),
};

// In business logic
contentMetrics.published.labels(orgId, 'article').inc();
contentMetrics.views.labels(orgId, contentId).inc();
```

### 5.3 Performance Profiling

**Identify bottlenecks:**

```bash
# 1. Use Node.js built-in profiler
node --prof app.js

# 2. Process profile
node --prof-process isolate-0x...-v8.log > profile.txt

# 3. Analyze with FlameGraph
# npm install -g flamegraph
node --prof app.js
node --prof-process isolate-*.log | stackvis > flamegraph.html
```

---

## 6. Monitoring Health Check

**Weekly Verification:**

```bash
#!/bin/bash
# scripts/monitoring-health-check.sh

echo "=== Monitoring Stack Health Check ==="

# 1. Prometheus health
echo -n "Prometheus: "
curl -s http://localhost:9090/-/healthy | grep -q "UP" && echo "✅" || echo "❌"

# 2. Grafana health
echo -n "Grafana: "
curl -s http://localhost:3001/api/health | jq -e '.database == "ok"' > /dev/null && echo "✅" || echo "❌"

# 3. AlertManager health
echo -n "AlertManager: "
curl -s http://localhost:9093/-/healthy | grep -q "UP" && echo "✅" || echo "❌"

# 4. Scrape job status
echo -e "\nScrape Jobs:"
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | "\(.labels.job): \(.health)"'

# 5. Alert status
echo -e "\nActive Alerts:"
curl -s http://localhost:9090/api/v1/alerts | jq '.data.alerts | length'

# 6. Disk usage
echo -e "\nPrometheus Storage:"
du -sh /var/lib/prometheus/

echo "=== Summary ==="
echo "All systems operational" || echo "Review failures above"
```

---

## 7. Quick Reference

### PromQL Cheat Sheet

```promql
# Rate of change (derivative)
rate(http_requests_total[5m])

# Sum over time range
sum(http_requests_total)

# Percentile (p95)
histogram_quantile(0.95, http_request_duration_ms_bucket)

# Group by label
sum by (status) (http_requests_total)

# Filter by label
http_requests_total{status="200"}

# Logical operators
http_errors_total > 100
http_requests_total > 1000 and up == 1

# Top 10 by value
topk(10, sum by (path) (rate(http_requests_total[1m])))

# Offset (look back in time)
http_requests_total offset 1h

# Increase over time range
increase(http_requests_total[1h])
```

### Common Queries by Use Case

**Find slow endpoints:**
```promql
topk(10, histogram_quantile(0.95, http_request_duration_ms_bucket) by (path))
```

**Error rate by endpoint:**
```promql
sum by (path) (rate(http_errors_total[5m])) / 
sum by (path) (rate(http_requests_total[5m])) * 100
```

**Database query performance:**
```promql
histogram_quantile(0.99, rate(pg_slow_queries_duration_ms_bucket[5m]))
```

**Cache effectiveness:**
```promql
redis_hits / (redis_hits + redis_misses)
```

---

**Document Version:** 1.0
**Last Updated:** 2024-07-31
**Owner:** Observability Team
**Next Review:** 2024-10-31 (Quarterly)

**Related Documents:**
- COST_OPTIMIZATION.md - Monitor cost metrics
- CAPACITY_PLANNING.md - Capacity metrics
- TEAM_TRAINING.md - Monitoring training module
- DISASTER_RECOVERY.md - Monitoring during recovery
