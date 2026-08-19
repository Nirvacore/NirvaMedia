#!/bin/bash
# NMD Production Deployment Script

set -e

echo "🚀 NMD Production Deployment"
echo "=============================="

# Configuration
DEPLOYMENT_ENV=${1:-production}
REGION=${2:-us-east-1}
DOCKER_REGISTRY=${DOCKER_REGISTRY:-docker.io}
IMAGE_NAME=${DOCKER_REGISTRY}/nirvacore/nmd-api
VERSION=$(git describe --tags --always)

echo "📦 Building Docker image..."
docker build -t ${IMAGE_NAME}:${VERSION} -t ${IMAGE_NAME}:latest .

echo "🔐 Logging into Docker registry..."
# Assumes DOCKER_USERNAME and DOCKER_PASSWORD are set
echo "${DOCKER_PASSWORD}" | docker login -u "${DOCKER_USERNAME}" --password-stdin

echo "📤 Pushing image to registry..."
docker push ${IMAGE_NAME}:${VERSION}
docker push ${IMAGE_NAME}:latest

echo "🗄️ Running database migrations..."
docker-compose run --rm nmd-api npm run migrate

echo "✅ Starting services..."
docker-compose up -d

echo "⏳ Waiting for services to be healthy..."
sleep 10

echo "🏥 Checking health status..."
HEALTH=$(curl -s http://localhost:3000/health | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

if [ "$HEALTH" = "healthy" ]; then
  echo "✅ Deployment successful!"
  echo ""
  echo "📊 Services running:"
  echo "  - API: http://localhost:3000"
  echo "  - GraphQL: http://localhost:3001"
  echo "  - Database: localhost:5432"
  echo "  - Cache: localhost:6379"
  echo "  - Monitoring: http://localhost:3001/grafana"
else
  echo "❌ Health check failed: $HEALTH"
  exit 1
fi
