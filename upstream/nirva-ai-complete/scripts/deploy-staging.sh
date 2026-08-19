#!/bin/bash
# Deploy to staging environment

set -e

VERSION=${1:-"latest"}
REGISTRY="ghcr.io"
REPO="${REGISTRY}/nirvacore/nirva-ai"
IMAGE="${REPO}:${VERSION}"
STAGING_HOST="${STAGING_HOST:-staging.nmd.platform}"
STAGING_SSH_KEY="${STAGING_SSH_KEY:-~/.ssh/staging-key}"

echo "════════════════════════════════════════════════════════════"
echo "NMD Platform - Staging Deployment"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Deploying version: $VERSION"
echo "Image: $IMAGE"
echo ""

# Pull latest image
echo "Pulling Docker image..."
docker pull "$IMAGE"

# Verify image
echo "Verifying image..."
docker image inspect "$IMAGE" > /dev/null || {
  echo "Failed to pull image: $IMAGE"
  exit 1
}

# Connect to staging and deploy
echo "Connecting to staging environment..."
ssh -i "$STAGING_SSH_KEY" "deployer@${STAGING_HOST}" << DEPLOY_SCRIPT
set -e

echo "Stopping current deployment..."
docker-compose -f /opt/nmd/docker-compose.yml down || true

echo "Pulling latest image..."
docker pull "$IMAGE"

echo "Starting new deployment..."
docker-compose -f /opt/nmd/docker-compose.yml up -d

echo "Waiting for services to be ready..."
sleep 10

echo "Checking service health..."
curl -sf http://localhost:3000/health || {
  echo "Health check failed!"
  exit 1
}

echo "Deployment successful!"
DEPLOY_SCRIPT

echo ""
echo "Staging deployment complete!"
echo "Testing endpoint: https://${STAGING_HOST}/health"
