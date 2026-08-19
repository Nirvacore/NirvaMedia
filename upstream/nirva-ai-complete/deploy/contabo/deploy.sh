#!/usr/bin/env bash
# Contabo VPS — deploy / update Nirva AI
# Run: bash deploy/contabo/deploy.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/nirva-AI}"
cd "$APP_DIR"

echo "=== Nirva AI — Deploy to Contabo ==="

# Optional git pull (manual deploy); CI uses SCP — no git needed
if [ -d .git ]; then
  git pull origin main 2>/dev/null || git pull 2>/dev/null || true
fi

if [ ! -f env/contabo.prod.env ]; then
  cp env/contabo.prod.env.example env/contabo.prod.env
  echo "⚠ Created env/contabo.prod.env — review settings"
fi

echo "→ Building and starting containers..."
docker compose -f docker-compose.prod.yml --env-file env/contabo.prod.env up -d --build

echo "→ Waiting for health..."
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
    echo "✓ Dashboard healthy"
    curl -s http://127.0.0.1:3000/api/health | head -c 200
    echo ""
    break
  fi
  sleep 2
done

echo ""
echo "=== Deploy complete ==="
echo "Local:  http://127.0.0.1:3000"
echo "Public: https://ai.nirva.one (after DNS + SSL)"
echo "Demo:   https://ai.nirva.one/demo"
echo ""
if [ -x scripts/verify-production.sh ]; then
  bash scripts/verify-production.sh http://127.0.0.1:3000 || true
fi
