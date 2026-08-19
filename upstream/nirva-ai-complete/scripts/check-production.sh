#!/usr/bin/env bash
# ตรวจ DNS + health จาก Mac (หลัง deploy)
set -euo pipefail

VPS_IP="${VPS_IP:-62.146.233.240}"
DOMAIN="${DOMAIN:-ai.nirva.one}"

echo "=== Nirva production check ==="
echo ""

echo "── DNS (${DOMAIN}) ──"
RESOLVED=$(dig +short "${DOMAIN}" A 2>/dev/null | head -1 || true)
if [ -z "$RESOLVED" ]; then
  echo "✗ ไม่พบ A record"
elif [ "$RESOLVED" = "$VPS_IP" ]; then
  echo "✓ ${DOMAIN} → ${RESOLVED} (ชี้ VPS ถูกต้อง)"
else
  echo "⚠ ${DOMAIN} → ${RESOLVED} (ยังไม่ใช่ ${VPS_IP} — อาจเป็น Cloudflare/Manus)"
fi
echo ""

echo "── HTTPS health ──"
HTTP_CODE=$(curl -sS -m 15 -o /tmp/nirva-health.json -w '%{http_code}' "https://${DOMAIN}/api/health" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo "✓ https://${DOMAIN}/api/health → 200"
  python3 -m json.tool /tmp/nirva-health.json 2>/dev/null || cat /tmp/nirva-health.json
else
  echo "✗ https://${DOMAIN}/api/health → ${HTTP_CODE}"
  head -c 300 /tmp/nirva-health.json 2>/dev/null || true
  echo ""
  echo "  ถ้ายัง 500: 1) deploy จาก Mac  2) wire-proxy บน VPS  3) DNS → ${VPS_IP}"
fi
rm -f /tmp/nirva-health.json
