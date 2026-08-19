# NMD Platform - Development Guide

Complete guide for setting up development environment and contributing to NMD Platform.

## Table of Contents

- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Local Setup](#local-setup)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Debugging](#debugging)
- [Architecture](#architecture)
- [Contributing](#contributing)

## Quick Start

```bash
# Clone repository
git clone https://github.com/nirvacore/nirva-ai.git
cd nirva-ai

# Copy environment template
cp .env.example .env

# Start development environment
docker-compose up -d

# Install dependencies
npm install

# Run development server
npm run dev

# Visit http://localhost:3000
```

## Prerequisites

- **Node.js**: v18.x or v20.x
- **npm**: v9.x or higher
- **Docker**: v20.x (for containerized development)
- **Docker Compose**: v1.29.x or higher
- **Git**: v2.x

### Optional Tools

- **PostgreSQL Client** (`psql`) - For direct database access
- **Redis Client** (`redis-cli`) - For cache debugging
- **curl** or **Postman** - For API testing

## Local Setup

### 1. Clone and Install

```bash
git clone https://github.com/nirvacore/nirva-ai.git
cd nirva-ai

npm install
```

### 2. Environment Configuration

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your settings
nano .env
```

Key variables to configure:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Secret key for JWT signing
- `OPENAI_API_KEY` - OpenAI API key (optional)

### 3. Start Infrastructure

**Option A: Using Docker Compose (Recommended)**

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

**Option B: Manual Setup**

```bash
# Start PostgreSQL
docker run -d --name postgres \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:16-alpine

# Start Redis
docker run -d --name redis \
  -p 6379:6379 \
  redis:7-alpine
```

### 4. Database Setup

```bash
# Apply migrations
npm run migrate

# Seed sample data (optional)
npm run seed
```

### 5. Start Development Server

```bash
# Start with hot reload
npm run dev

# Or with debugging
npm run dev:debug

# Production build
npm run build
npm start
```

## Development Workflow

### File Structure

```
.
├── server/
│   ├── api/              # API routes and handlers
│   ├── modules/          # Core business modules
│   ├── security/         # Authentication & authorization
│   ├── performance/      # Performance monitoring
│   ├── analytics/        # Analytics engine
│   ├── extensions/       # Optional extensions
│   ├── __tests__/        # Test suites
│   └── index.ts          # Entry point
├── sdk/
│   ├── nmd-sdk.ts        # TypeScript SDK
│   ├── examples/         # Usage examples
│   └── README.md         # SDK documentation
├── ui/
│   ├── admin-dashboard.html
│   └── components/
├── monitoring/           # Prometheus/Grafana config
├── scripts/              # Utility scripts
└── .github/workflows/    # CI/CD pipelines
```

### Code Style

- **Language**: TypeScript (strict mode enabled)
- **Formatter**: Prettier
- **Linter**: ESLint with security plugins
- **Indentation**: 2 spaces

```bash
# Format code
npm run format

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Creating a Feature

1. Create feature branch

```bash
git checkout -b feature/your-feature-name
```

2. Implement feature with tests

```bash
# Create tests first
# Implement feature
# Verify tests pass
npm test
```

3. Commit changes

```bash
git add .
git commit -m "feat: description of your feature"
```

4. Push and create PR

```bash
git push origin feature/your-feature-name
```

## Testing

### Test Organization

```
server/__tests__/
├── unit/              # Unit tests
├── integration/       # Integration tests
├── e2e/               # End-to-end tests
├── security/          # Security tests
└── performance/       # Performance benchmarks
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- server/__tests__/unit/example.test.ts

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch

# Run only security tests
npm test -- --testPathPattern=security

# Run only performance tests
npm test -- --testPathPattern=performance
```

### Writing Tests

```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  it('should do something', async () => {
    // Arrange
    const input = { test: true };

    // Act
    const result = await yourFunction(input);

    // Assert
    expect(result).toBe(expected);
  });

  it('should handle errors gracefully', async () => {
    expect(() => {
      yourFunction(invalidInput);
    }).toThrow(ExpectedError);
  });
});
```

## Debugging

### VS Code Debugging

1. Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug",
      "program": "${workspaceFolder}/server/index.ts",
      "preLaunchTask": "tsc: build",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "runtimeArgs": ["--require", "ts-node/register"]
    }
  ]
}
```

2. Set breakpoints and press F5

### Console Logging

```typescript
// Development logging
if (process.env.DEBUG) {
  console.log('Debug info:', data);
}

// Use structured logging in production
import logger from './logger';
logger.info('Event occurred', { context: data });
```

### Database Debugging

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U nmd_user -d nmd_db

# View Redis keys
docker-compose exec redis redis-cli
redis> KEYS *
redis> GET key_name
```

## Architecture

### 17-Module System

The platform consists of 17 integrated modules:

**Core Modules** (13):
1. Content Management
2. Templates
3. Metrics & Analytics
4. Webhooks
5. Search & Discovery
6. Approval Workflows
7. Publishing & Scheduling
8. Collaboration Tools
9. A/B Testing
10. ROI Attribution
11. Real-time Alerts
12. Version Control
13. Library Management

**Advanced Modules** (2):
- AI Content Assistant
- Advanced Search Engine

**System Modules** (2):
- Security & Authentication
- Performance Monitoring

### Design Patterns

1. **Provider Pattern**: Abstraction for extensibility
2. **Event-Driven**: Webhook system for async operations
3. **Multi-Tenancy**: Organization-based data isolation
4. **RBAC**: Role-based access control
5. **Repository Pattern**: Database abstraction

## Contributing

### Pull Request Process

1. Fork repository
2. Create feature branch (`git checkout -b feature/xyz`)
3. Make changes
4. Add tests
5. Run test suite (`npm test`)
6. Run linter (`npm run lint`)
7. Commit changes
8. Push to branch (`git push origin feature/xyz`)
9. Create Pull Request

### Commit Messages

Follow conventional commits:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `perf`: Performance improvement
- `test`: Test additions
- `chore`: Dependency updates

Example:
```
feat(content): add content versioning system

Add ability to track content versions with automatic backups.
Includes rollback functionality.

Closes #123
```

### Code Review Guidelines

- Ensure tests pass
- Check code style
- Verify security implications
- Review performance impact
- Add documentation
- Update changelog

## Troubleshooting

### Common Issues

**Port already in use**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

**Database connection error**
```bash
# Check PostgreSQL
docker-compose logs postgres

# Reset database
npm run migrate:reset
```

**Redis connection error**
```bash
# Check Redis
docker-compose logs redis

# Flush cache
docker-compose exec redis redis-cli FLUSHALL
```

**Tests failing**
```bash
# Run with verbose output
npm test -- --verbose

# Run single test file
npm test -- server/__tests__/unit/example.test.ts
```

## Resources

- **API Documentation**: [docs/API.md](docs/API.md)
- **SDK Documentation**: [sdk/README.md](sdk/README.md)
- **Architecture**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Database Schema**: [docs/SCHEMA.md](docs/SCHEMA.md)
- **Deployment**: [DEPLOYMENT.md](DEPLOYMENT.md)

## Getting Help

- Check existing issues: https://github.com/nirvacore/nirva-ai/issues
- Create new issue with details
- Join Discord community
- Email: dev@nmd.platform

## Performance Tips

1. Use connection pooling
2. Enable caching for frequently accessed data
3. Index database queries properly
4. Use pagination for large result sets
5. Monitor performance metrics

## Security Best Practices

1. Never commit secrets or credentials
2. Validate all user input
3. Use parameterized queries
4. Implement rate limiting
5. Enable HTTPS in production
6. Keep dependencies updated
7. Regular security audits

Happy coding! 🚀
