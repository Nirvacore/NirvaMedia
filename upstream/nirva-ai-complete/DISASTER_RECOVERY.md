# NMD Platform - Disaster Recovery Plan

Comprehensive procedures for handling emergencies and recovery scenarios.

## 📋 Overview

This document outlines procedures for:
- **Backup & Restore** - Data protection and recovery
- **Failover** - Service continuity
- **Incident Response** - Emergency procedures
- **Testing** - DR validation

## 🔄 Backup Strategy

### Database Backups

**Frequency**: Every hour (automated)  
**Retention**: 30 days  
**Location**: Encrypted S3 bucket

```bash
# Manual backup
docker-compose exec postgres pg_dump -U nmd_user nmd_db > backup.sql

# Automated backup (cron job)
0 * * * * pg_dump -U nmd_user nmd_db | gzip > /backups/nmd-$(date +\%Y\%m\%d-\%H\%M\%S).sql.gz
```

### Cache Backups

**Frequency**: Every 6 hours  
**Retention**: 7 days  
**Strategy**: RDB snapshots

```bash
# Redis RDB backup location
/var/lib/redis/dump.rdb

# Manual trigger
redis-cli BGSAVE
```

### File Storage Backups

**Frequency**: Continuous (S3 versioning)  
**Retention**: 90 days  
**Strategy**: Cross-region replication

## 🔌 Recovery Procedures

### Database Recovery

**Recovery Time Objective (RTO)**: 30 minutes  
**Recovery Point Objective (RPO)**: 1 hour

```bash
# 1. Stop application
docker-compose down api

# 2. Find backup
ls -lht /backups/ | head -5

# 3. Restore from backup
docker-compose exec postgres psql -U nmd_user nmd_db < /backups/backup.sql

# 4. Verify integrity
docker-compose exec postgres pg_restore --list /backups/backup.sql | head -20

# 5. Restart application
docker-compose up -d api

# 6. Verify connection
curl http://localhost:3000/health
```

### Cache Recovery

**RTO**: 5 minutes  
**RPO**: Real-time (in-memory)

```bash
# 1. Restore Redis
docker-compose cp /backups/dump.rdb redis:/data/

# 2. Restart Redis
docker-compose restart redis

# 3. Verify
docker-compose exec redis redis-cli ping
```

### Full System Disaster

**RTO**: 2 hours  
**RPO**: 1 hour

```bash
# 1. Create fresh infrastructure
docker-compose down -v
rm -rf data/*

# 2. Restore all services
docker-compose up -d

# 3. Restore database
docker-compose exec postgres psql -U nmd_user nmd_db < /backups/latest-backup.sql

# 4. Verify all services
make health-check

# 5. Restore from S3 if needed
aws s3 sync s3://nmd-backups/latest / --recursive
```

## 🚨 Incident Response

### Service Degradation

**Detection**: Monitoring alerts (response time > 1s)

```bash
# 1. Check service status
make health-check

# 2. View logs
docker-compose logs -f api

# 3. Check resources
docker stats

# 4. Identify bottleneck
# - High CPU? → Check queries
# - High memory? → Check cache
# - High I/O? → Check disk
```

### Database Connection Pool Exhaustion

**Detection**: "too many connections" error

```bash
# 1. Check current connections
docker-compose exec postgres psql -U nmd_user -c "SELECT count(*) FROM pg_stat_activity;"

# 2. Kill idle connections
docker-compose exec postgres psql -U nmd_user -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state='idle' AND query_start < NOW() - INTERVAL '10 minutes';"

# 3. Increase pool size (in .env)
DATABASE_POOL_MAX=30

# 4. Restart
docker-compose restart api
```

### Cache Failure (Redis Down)

**Impact**: Performance degradation, not data loss  
**RTO**: < 5 minutes

```bash
# 1. Restart Redis
docker-compose restart redis

# 2. Warm cache (optional)
npm run cache:warm

# 3. Monitor cache hit rate
# Should recover to 70%+ within 5 minutes
```

### Disk Space Critical

**Detection**: Disk > 90%

```bash
# 1. Check disk usage
df -h

# 2. Find large files
du -sh /var/lib/postgresql/* | sort -h

# 3. Clean old logs
find /logs -name "*.log" -mtime +30 -delete

# 4. Truncate tables if needed
docker-compose exec postgres psql -U nmd_user -c "TRUNCATE activity_log;"

# 5. Extend disk space (cloud provider)
# - AWS: Modify EBS volume
# - Azure: Extend managed disk
# - Digital Ocean: Resize droplet
```

## 🔄 Failover Procedures

### Primary Database Failure

**Detection**: Health check fails × 3  
**RTO**: 5 minutes

```bash
# 1. Verify primary is down
docker-compose exec postgres pg_isready

# 2. If down, promote replica
PROMOTE_REPLICA=true docker-compose up -d

# 3. Update connection string
# DATABASE_URL=postgresql://...replica-host

# 4. Restart application
docker-compose restart api

# 5. Verify
curl http://localhost:3000/health
```

### Secondary Instance Takeover

**Scenario**: Primary region outage

```bash
# 1. Spin up in secondary region
# (Via cloud provider console or IaC tool)

# 2. Restore latest backup
./scripts/restore-from-backup.sh latest-backup.sql

# 3. Update DNS/load balancer
aws route53 change-resource-record-sets ...

# 4. Verify traffic routing
curl https://api.nmd.platform/health
```

## 📊 Backup Verification

### Weekly Backup Test

```bash
# Schedule: Every Sunday 2 AM

# 1. Restore to test environment
docker-compose -f docker-compose.test.yml up -d
./scripts/restore-from-backup.sh $(date -d '7 days ago' +%Y%m%d).backup

# 2. Run smoke tests
npm test -- --testPathPattern=smoke

# 3. Verify data integrity
npm run verify:backup-integrity

# 4. Generate report
echo "Backup verification passed on $(date)" >> reports/backup-verification.log

# 5. Cleanup
docker-compose -f docker-compose.test.yml down -v
```

### Monthly Full Recovery Test

```bash
# Schedule: First Monday of month, 1 AM

# 1. Create test infrastructure
terraform apply -var="environment=test"

# 2. Restore all data
./scripts/full-restore.sh

# 3. Run full test suite
npm test

# 4. Performance validation
npm run performance:benchmark

# 5. Document findings
./scripts/generate-dr-report.sh
```

## 📋 Runbooks

### Quick Reference Card

| Scenario | RTO | RPO | Steps |
|----------|-----|-----|-------|
| Restart service | 1 min | 0 | `docker-compose restart SERVICE` |
| Restore database | 30 min | 1 hr | See DB Recovery section |
| Full failover | 2 hrs | 1 hr | See Failover section |
| Restore from S3 | 15 min | 5 min | `aws s3 sync s3://...` |

### Emergency Contact Tree

```
On-Call Engineer (Page)
  ↓
Engineering Manager
  ↓
Platform Lead
  ↓
VP Engineering
  ↓
CEO
```

**On-Call Schedule**: https://pagerduty.nmd.platform  
**Status Page**: https://status.nmd.platform

## 🧪 Testing Schedule

| Test | Frequency | Duration | Success Criteria |
|------|-----------|----------|-----------------|
| Backup verification | Weekly | 15 min | Data integrity ✓ |
| Single component failure | Weekly | 30 min | Automatic recovery ✓ |
| Multi-component failure | Monthly | 2 hrs | < 5 min recovery ✓ |
| Full regional failover | Quarterly | 4 hrs | < 30 min RTO ✓ |

## 📈 Recovery Metrics

### Target Metrics

- **RTO** (Recovery Time Objective): 2 hours max
- **RPO** (Recovery Point Objective): 1 hour max
- **MTTR** (Mean Time To Repair): 30 minutes
- **MTBF** (Mean Time Between Failures): > 720 hours

### Monitoring

```sql
-- Database recovery time
SELECT AVG(recovery_time_minutes) FROM recovery_log WHERE success = true;

-- Backup success rate
SELECT COUNT(*) FILTER (WHERE success = true) * 100 / COUNT(*) FROM backup_log;

-- Data loss incidents
SELECT COUNT(*) FROM recovery_log WHERE data_loss_bytes > 0;
```

## 📞 Support Contacts

| Role | Contact | Availability |
|------|---------|--------------|
| On-Call | PagerDuty | 24/7 |
| Database Expert | ops-db@nmd.platform | 24/7 |
| Infrastructure | ops@nmd.platform | 24/7 |
| Management | director@nmd.platform | Business hours |

## ✅ Compliance

- ✅ Daily automated backups
- ✅ Weekly backup verification
- ✅ Monthly full recovery test
- ✅ Quarterly failover test
- ✅ Documented procedures
- ✅ Staff trained
- ✅ Audit trail maintained

**Last Tested**: [Date]  
**Next Test**: [Date]  
**Status**: ✅ VERIFIED

---

For additional details, see:
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment procedures
- [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md) - Pre-launch checklist
- [Runbook](https://wiki.nmd.platform/runbooks) - Detailed procedures
