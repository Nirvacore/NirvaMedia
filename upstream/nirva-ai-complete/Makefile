.PHONY: help install dev test lint format clean docker-up docker-down deploy-staging deploy-prod

help:
	@echo "NMD Platform - Development Commands"
	@echo ""
	@echo "Setup:"
	@echo "  make install          Install dependencies"
	@echo "  make dev              Start development server"
	@echo ""
	@echo "Testing:"
	@echo "  make test             Run all tests"
	@echo "  make test-unit        Run unit tests"
	@echo "  make test-integration Run integration tests"
	@echo "  make test-security    Run security tests"
	@echo "  make test-coverage    Run tests with coverage"
	@echo ""
	@echo "Code Quality:"
	@echo "  make lint             Run linter"
	@echo "  make format           Format code"
	@echo "  make type-check       Check TypeScript types"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-up        Start Docker services"
	@echo "  make docker-down      Stop Docker services"
	@echo "  make docker-build     Build Docker image"
	@echo "  make docker-logs      View Docker logs"
	@echo ""
	@echo "Database:"
	@echo "  make db-migrate       Run database migrations"
	@echo "  make db-reset         Reset database"
	@echo "  make db-seed          Seed sample data"
	@echo ""
	@echo "Deployment:"
	@echo "  make deploy-staging   Deploy to staging"
	@echo "  make deploy-prod      Deploy to production"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean            Clean build artifacts"
	@echo "  make health-check     Check service health"
	@echo "  make validate         Run deployment validation"

install:
	npm install

dev:
	npm run dev

test:
	npm test

test-unit:
	npm test -- --testPathPattern='unit'

test-integration:
	npm test -- --testPathPattern='integration'

test-security:
	npm test -- --testPathPattern='security'

test-coverage:
	npm test -- --coverage

lint:
	npm run lint

format:
	npm run format

type-check:
	npm run type-check

build:
	npm run build

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-build:
	docker build -t nmd-platform:latest .

docker-logs:
	docker-compose logs -f

docker-ps:
	docker-compose ps

db-migrate:
	npm run migrate

db-reset:
	npm run migrate:reset

db-seed:
	npm run seed

clean:
	rm -rf dist/
	rm -rf coverage/
	rm -rf node_modules/
	rm -rf .tsc-out/

health-check:
	@echo "Checking service health..."
	@curl -s http://localhost:3000/health | jq .
	@echo ""

validate:
	bash scripts/deploy-validate.sh

deploy-staging: test
	bash scripts/deploy-staging.sh

deploy-prod: test
	@echo "WARNING: About to deploy to PRODUCTION"
	bash scripts/deploy-production.sh

logs-api:
	docker-compose logs -f api

logs-db:
	docker-compose logs -f postgres

logs-cache:
	docker-compose logs -f redis

db-shell:
	docker-compose exec postgres psql -U nmd_user -d nmd_db

cache-shell:
	docker-compose exec redis redis-cli

setup: install docker-up db-migrate
	@echo ""
	@echo "✓ Development environment setup complete!"
	@echo ""
	@echo "Next steps:"
	@echo "  make dev              Start development server"
	@echo "  make test             Run tests"
	@echo "  make health-check     Verify services are running"
	@echo ""

all: clean install lint test build

.DEFAULT_GOAL := help
