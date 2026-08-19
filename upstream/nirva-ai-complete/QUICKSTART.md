# NMD Platform - Quick Reference Guide

## 🚀 Getting Started (2 Minutes)

### One-Command Setup

```bash
make setup
```

This single command will:
- ✅ Install all dependencies
- ✅ Start Docker services (PostgreSQL, Redis, Prometheus, Grafana)
- ✅ Initialize database
- ✅ Configure environment
- ✅ Ready for development

### Verify Installation

```bash
make health-check
```

Should return 200 OK with service status.

## 📚 Essential Commands

### Development

```bash
make dev           # Start development server (port 3000)
make test          # Run all tests
make lint          # Check code style
make format        # Auto-format code
```

### Testing

```bash
make test          # All tests
make test-unit     # Unit tests only
make test-coverage # With coverage report
```

### Database

```bash
make db-migrate    # Run migrations
make db-reset      # Reset database
make db-seed       # Seed sample data
make db-shell      # Connect to PostgreSQL
```

### Docker

```bash
make docker-up     # Start services
make docker-down   # Stop services
make docker-logs   # View logs
docker-compose ps  # Service status
```

### Monitoring

```bash
make health-check  # API health status
docker-compose logs -f api       # Live API logs
docker-compose logs -f postgres  # Database logs
docker-compose logs -f redis     # Cache logs
```

### Deployment

```bash
make validate            # Pre-deployment checks
make deploy-staging      # Deploy to staging
make deploy-prod         # Deploy to production (with confirmation)
```

## 🔗 Service URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| API | http://localhost:3000 | API Key required |
| Grafana | http://localhost:3001 | admin / admin |
| Prometheus | http://localhost:9091 | None |
| pgAdmin | http://localhost:5050 | admin@nmd.local / admin |
| Redis Commander | http://localhost:8081 | None |
| PostgreSQL | localhost:5432 | nmd_user / nmd_password |

## 📖 Accessing Services

### PostgreSQL

```bash
# Via Docker Compose
make db-shell

# Via psql command
psql -h localhost -U nmd_user -d nmd_db

# Password: nmd_password
```

### Redis

```bash
# Via Docker Compose
docker-compose exec redis redis-cli

# Via redis-cli
redis-cli -h localhost -p 6379
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f postgres
docker-compose logs -f redis
```

## 🧪 Running Tests

```bash
# All tests with coverage
npm test -- --coverage

# Specific test file
npm test -- server/__tests__/nmd-security.test.ts

# Watch mode (re-run on file changes)
npm test -- --watch

# Specific test suite
npm test -- --testNamePattern="Authentication"
```

## 🔐 Authentication

All API requests require Bearer token:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  http://localhost:3000/health
```

Get API key: Contact administrator or check dashboard.

## 📊 Monitoring & Metrics

### Grafana Dashboard

1. Open http://localhost:3001
2. Login: admin / admin
3. Pre-configured dashboards:
   - API Performance
   - Database Health
   - Cache Statistics
   - System Resources

### Prometheus Queries

```
# Request rate
rate(http_request_total[5m])

# Error rate
rate(http_request_total{status=~"5.."}[5m])

# Response time (95th percentile)
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Cache hit rate
rate(redis_keyspace_hits_total[5m]) / (rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m]))
```

## 🛠️ Debugging

### Enable Debug Logging

```bash
# In .env
DEBUG=true
VERBOSE_LOGGING=true

# Then restart
make dev
```

### Check Service Health

```bash
# API
curl http://localhost:3000/health

# Database
docker-compose exec postgres pg_isready

# Redis
docker-compose exec redis redis-cli ping

# All services
make health-check
```

### Common Issues

**Port already in use**
```bash
lsof -ti:3000 | xargs kill -9
```

**Database connection error**
```bash
docker-compose logs postgres
docker-compose down
docker-compose up -d
```

**Redis connection error**
```bash
docker-compose logs redis
docker-compose restart redis
```

**Tests failing**
```bash
npm test -- --verbose
npm test -- --testPathPattern="specific-test"
```

## 📦 Build & Deployment

### Local Build

```bash
npm run build
npm start
```

### Docker Build

```bash
docker build -t nmd-platform:latest .
docker run -p 3000:3000 nmd-platform:latest
```

### Production Deployment

```bash
# Staging
make deploy-staging

# Production (requires confirmation)
make deploy-prod

# Verify deployment
curl https://api.nmd.platform/health
```

## 📝 Project Structure

```
├── server/              # Backend
│   ├── api/            # Routes
│   ├── modules/        # Core features (13)
│   ├── extensions/     # Extensions (2)
│   ├── security/       # Auth & encryption
│   ├── performance/    # Monitoring
│   ├── analytics/      # Analytics engine
│   ├── features/       # Feature flags
│   └── __tests__/      # Tests
├── sdk/                # Client SDKs
│   ├── nmd-sdk.ts     # TypeScript
│   ├── python/        # Python SDK
│   └── go/            # Go SDK
├── ui/                 # Dashboard
├── monitoring/         # Prometheus/Grafana
├── scripts/            # Deployment
├── docs/               # Documentation
└── .github/workflows/  # CI/CD
```

## 🚨 Troubleshooting Quick Lookup

| Issue | Command | Solution |
|-------|---------|----------|
| Services won't start | `docker-compose logs` | Check logs, restart Docker |
| Port conflict | `lsof -ti:PORT` | Kill process or change port |
| Database error | `make db-reset` | Reset and reseed |
| Tests fail | `npm test -- --verbose` | Check error messages |
| Memory issue | `docker system prune` | Clean up Docker |
| Cache issue | `docker-compose exec redis redis-cli FLUSHALL` | Clear cache |

## 📚 Documentation

- **Full Setup**: [DEVELOPMENT.md](DEVELOPMENT.md)
- **API Reference**: [docs/API.md](docs/API.md)
- **SDK Guide**: [sdk/README.md](sdk/README.md)
- **Deployment**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Contributing**: [CONTRIBUTING.md](CONTRIBUTING.md)

## 💡 Pro Tips

1. **Use `make help`** - Shows all available commands
2. **Watch mode testing** - `npm test -- --watch` for fast feedback
3. **Format before commit** - `make format` prevents lint errors
4. **Check health first** - `make health-check` before debugging
5. **Read the logs** - `docker-compose logs` solves 80% of issues

## 🎯 Common Workflows

### Fix a Bug

```bash
# 1. Update code
vim server/file.ts

# 2. Test locally
make test

# 3. Format
make format

# 4. Commit
git add .
git commit -m "fix: description"

# 5. Push
git push origin branch-name
```

### Add a Feature

```bash
# 1. Create branch
git checkout -b feature/name

# 2. Develop
make dev

# 3. Test thoroughly
make test

# 4. Check style
make lint

# 5. Prepare deployment
make validate

# 6. Commit and push
git commit -am "feat: description"
git push origin feature/name
```

### Deploy to Production

```bash
# 1. Verify all tests pass
make test

# 2. Validate deployment readiness
make validate

# 3. Deploy (will ask for confirmation)
make deploy-prod

# 4. Verify
curl https://api.nmd.platform/health
```

## 🆘 Get Help

- **GitHub Issues**: https://github.com/nirvacore/nirva-ai/issues
- **Discussions**: https://github.com/nirvacore/nirva-ai/discussions
- **Email**: support@nmd.platform
- **Slack**: [Join community]

---

**Last Updated**: January 2024
**Platform Version**: 1.0.0
**Status**: ✅ Production Ready

Happy coding! 🚀
