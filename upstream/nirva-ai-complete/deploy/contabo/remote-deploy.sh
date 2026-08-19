#!/usr/bin/env bash
# Runs ON Contabo VPS — called by GitHub Actions or manually
# Idempotent: safe to run repeatedly
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/nirva-AI}"
cd "$APP_DIR"

echo "=== Nirva remote-deploy $(date -Is) ==="

# Docker
if ! command -v docker &>/dev/null; then
  echo "→ Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi

if ! docker compose version &>/dev/null; then
  apt-get update -qq
  apt-get install -y docker-compose-plugin curl ca-certificates python3 2>/dev/null || true
fi

# Env
if [ ! -f env/contabo.prod.env ]; then
  cp env/contabo.prod.env.example env/contabo.prod.env
  echo "✓ Created env/contabo.prod.env"
fi

# Pick host port — nirvacore มักใช้ 3000-3001
# shellcheck source=deploy/contabo/pick-port.sh
source "$(dirname "$0")/pick-port.sh"
export DASHBOARD_HOST_PORT="$(pick_dashboard_port)"
echo "→ Dashboard will bind 127.0.0.1:${DASHBOARD_HOST_PORT}"
if [ -f env/contabo.prod.env ]; then
  grep -v '^DASHBOARD_HOST_PORT=' env/contabo.prod.env > env/contabo.prod.env.tmp || true
  mv env/contabo.prod.env.tmp env/contabo.prod.env
  echo "DASHBOARD_HOST_PORT=${DASHBOARD_HOST_PORT}" >> env/contabo.prod.env
fi
echo "${DASHBOARD_HOST_PORT}" > env/.dashboard-port
HEALTH_URL="http://127.0.0.1:${DASHBOARD_HOST_PORT}/api/health"

# Nginx — only if ports 80/443 are free (skip if nirvacore stack uses them)
port_busy() {
  ss -tlnp 2>/dev/null | grep -q "$1"
}

if ! port_busy ':80 ' && ! port_busy ':443 '; then
  if ! command -v nginx &>/dev/null; then
    apt-get update -qq
    apt-get install -y nginx certbot python3-certbot-nginx 2>/dev/null || true
  fi
  if [ -f deploy/contabo/nginx-http.conf ]; then
    cp deploy/contabo/nginx-http.conf /etc/nginx/sites-available/ai.nirva.one
    ln -sf /etc/nginx/sites-available/ai.nirva.one /etc/nginx/sites-enabled/ai.nirva.one 2>/dev/null || true
    rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
    if nginx -t 2>/dev/null; then
      systemctl reload nginx 2>/dev/null || systemctl start nginx 2>/dev/null || true
      echo "✓ Nginx configured for ai.nirva.one"
    fi
  fi
else
  echo "⚠ Ports 80/443 busy — skip nginx"
  echo "  → ตั้ง reverse proxy เดิม: ai.nirva.one → http://127.0.0.1:${DASHBOARD_HOST_PORT}"
fi

# Build & start stack (project name nirva-ai — ไม่ชน nirvacore)
export APP_DIR
docker compose -p nirva-ai -f docker-compose.prod.yml --env-file env/contabo.prod.env up -d --build

echo "→ Health check (${HEALTH_URL})..."
for i in $(seq 1 45); do
  if curl -sf "$HEALTH_URL" >/dev/null 2>&1; then
    curl -s "$HEALTH_URL" | python3 -m json.tool 2>/dev/null || curl -s "$HEALTH_URL"
    echo ""
    echo "=== remote-deploy OK ==="
    echo "PORT=${DASHBOARD_HOST_PORT}"
    echo "PROXY: ai.nirva.one → http://127.0.0.1:${DASHBOARD_HOST_PORT}"
    bash "$(dirname "$0")/wire-proxy.sh" || true
    exit 0
  fi
  sleep 4
done

echo "✗ Health check failed — docker logs:"
docker compose -p nirva-ai -f docker-compose.prod.yml logs dashboard --tail 40 2>/dev/null || docker ps -a
exit 1
