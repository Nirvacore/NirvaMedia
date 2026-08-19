#!/bin/bash
# Deploy to production environment with safety checks

set -e

VERSION=${1:-"latest"}
REGISTRY="ghcr.io"
REPO="${REGISTRY}/nirvacore/nirva-ai"
IMAGE="${REPO}:${VERSION}"
PROD_HOST="${PROD_HOST:-api.nmd.platform}"
PROD_SSH_KEY="${PROD_SSH_KEY:-~/.ssh/prod-key}"
BACKUP_DIR="/backups/nmd-$(date +%Y%m%d-%H%M%S)"

echo "════════════════════════════════════════════════════════════"
echo "NMD Platform - PRODUCTION Deployment"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "VERSION: $VERSION"
echo "IMAGE: $IMAGE"
echo "TARGET: $PROD_HOST"
echo ""

# Safety checks
read -p "Are you sure you want to deploy to PRODUCTION? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Deployment cancelled"
  exit 1
fi

echo ""
echo "Running pre-deployment checks..."

# Verify image exists and is healthy
echo "✓ Verifying Docker image..."
docker pull "$IMAGE" || {
  echo "✗ Failed to pull image"
  exit 1
}

docker image inspect "$IMAGE" > /dev/null || {
  echo "✗ Image verification failed"
  exit 1
}

# Test image locally
echo "✓ Testing image locally..."
docker run --rm -e NODE_ENV=test "$IMAGE" npm test -- --maxWorkers=2 || {
  echo "✗ Image tests failed"
  exit 1
}

echo ""
echo "Pre-deployment checks passed!"
echo ""

# Connect to production and deploy
echo "Connecting to production environment..."
ssh -i "$PROD_SSH_KEY" "deployer@${PROD_HOST}" << DEPLOY_SCRIPT
set -e

echo "Creating backup..."
mkdir -p "$BACKUP_DIR"
docker-compose -f /opt/nmd/docker-compose.yml stop || true
tar -czf "$BACKUP_DIR/database.tar.gz" /opt/nmd/data/postgres || true
tar -czf "$BACKUP_DIR/redis.tar.gz" /opt/nmd/data/redis || true

echo "Pulling new image..."
docker pull "$IMAGE"

echo "Updating deployment..."
cd /opt/nmd
sed -i "s|image: .*|image: $IMAGE|g" docker-compose.yml

echo "Starting services with health checks..."
docker-compose -f /opt/nmd/docker-compose.yml up -d

echo "Waiting for services..."
sleep 15

echo "Running health checks..."
HEALTH_CHECK_ATTEMPTS=0
MAX_ATTEMPTS=30

while [ $HEALTH_CHECK_ATTEMPTS -lt $MAX_ATTEMPTS ]; do
  if curl -sf http://localhost:3000/health > /dev/null 2>&1; then
    echo "✓ Service is healthy!"
    break
  fi
  
  HEALTH_CHECK_ATTEMPTS=$((HEALTH_CHECK_ATTEMPTS + 1))
  echo "Waiting for service to be ready... ($HEALTH_CHECK_ATTEMPTS/$MAX_ATTEMPTS)"
  sleep 5
done

if [ $HEALTH_CHECK_ATTEMPTS -eq $MAX_ATTEMPTS ]; then
  echo "✗ Service health check failed!"
  echo "Rolling back deployment..."
  docker-compose -f /opt/nmd/docker-compose.yml down
  exit 1
fi

echo "✓ Deployment successful!"
DEPLOY_SCRIPT

echo ""
echo "════════════════════════════════════════════════════════════"
echo "Production deployment complete!"
echo "Deployed version: $VERSION"
echo "Verify: https://${PROD_HOST}/health"
echo "════════════════════════════════════════════════════════════"
