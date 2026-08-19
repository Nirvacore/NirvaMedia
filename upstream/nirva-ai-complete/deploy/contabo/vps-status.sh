#!/usr/bin/env bash
# รันบน VPS — ดูสถานะ deploy
set -euo pipefail

echo "=== Nirva VPS Status ==="
echo "Host: $(hostname) · $(curl -sS ifconfig.me 2>/dev/null || echo '?')"
echo ""

echo "── Ports ──"
ss -tlnp 2>/dev/null | grep -E ':3000|:3001|:3100|:80|:443' || echo "(none)"
echo ""

echo "── Docker ──"
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null | head -20 || echo "docker not running"
echo ""

echo "── Nirva health ──"
for p in 3100 3101 3200 3000; do
  if curl -sf -m 2 "http://127.0.0.1:${p}/api/health" >/dev/null 2>&1; then
    echo "✓ 127.0.0.1:${p}"
    curl -s "http://127.0.0.1:${p}/api/health" | head -c 200
    echo ""
  fi
done

if [ -f /opt/nirva-AI/env/.dashboard-port ]; then
  echo "Saved port: $(cat /opt/nirva-AI/env/.dashboard-port)"
fi

if [ -d /opt/nirva-AI/.git ] || [ -f /opt/nirva-AI/docker-compose.prod.yml ]; then
  echo "✓ /opt/nirva-AI exists"
else
  echo "✗ /opt/nirva-AI missing — รัน deploy จาก Mac: bash scripts/deploy-now.sh"
fi

echo ""
echo "── DNS check (ai.nirva.one) ──"
dig +short ai.nirva.one A 2>/dev/null || true
