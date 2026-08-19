#!/usr/bin/env bash
# Deploy จาก Mac → Contabo ทันที (ไม่ต้อง GitHub Secrets)
# Usage: bash scripts/deploy-now.sh
# ใส่รหัส root เมื่อ SSH ถาม (ครั้งแรก)
set -euo pipefail

VPS_IP="${VPS_IP:-62.146.233.240}"
VPS_USER="${VPS_USER:-root}"
VPS="${VPS_USER}@${VPS_IP}"
APP_DIR="/opt/nirva-AI"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="$(node -p "require('${ROOT}/package.json').version" 2>/dev/null || echo '?')"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Nirva AI — Deploy Now (Mac → VPS)                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo "Target: ${VPS}:${APP_DIR}"
echo "Version: v${VERSION}"
echo ""

if [ ! -f "${ROOT}/deploy/contabo/remote-deploy.sh" ]; then
  echo "✗ ไม่พบ deploy/contabo/remote-deploy.sh — repo เก่าเกินไป"
  echo "  รัน: git fetch origin main && git reset --hard origin/main"
  echo "  หรือ: bash scripts/mac-fix-and-deploy.sh"
  exit 1
fi

# SSH options — ใช้ key ถ้ามี ไม่งั้น password
SSH_OPTS=(-o StrictHostKeyChecking=accept-new)
if [ -f "$HOME/.ssh/nirva_contabo_deploy" ]; then
  SSH_OPTS+=(-i "$HOME/.ssh/nirva_contabo_deploy")
fi

echo "→ ทดสอบ SSH..."
if ! ssh "${SSH_OPTS[@]}" "$VPS" "echo OK" 2>/dev/null; then
  echo "✗ SSH ไม่ได้ — ลอง: ssh ${VPS}"
  exit 1
fi

echo "→ สร้างโฟลเดอร์บน VPS..."
ssh "${SSH_OPTS[@]}" "$VPS" "mkdir -p ${APP_DIR}"

echo "→ อัปโหลดโค้ด (rsync)..."
if command -v rsync &>/dev/null; then
  rsync -az --delete \
    --exclude node_modules \
    --exclude dist \
    --exclude .git \
    --exclude storybook-static \
    --exclude data \
    --exclude nirva-AI \
    --exclude .manus-logs \
    "${ROOT}/" "${VPS}:${APP_DIR}/"
else
  echo "  (ไม่มี rsync — ใช้ tar+scp)"
  TAR="/tmp/nirva-deploy-$$.tar.gz"
  tar -czf "$TAR" -C "$ROOT" \
    --exclude node_modules --exclude dist --exclude .git \
    --exclude storybook-static --exclude data \
    --exclude nirva-AI --exclude .manus-logs \
    .
  scp "${SSH_OPTS[@]}" "$TAR" "${VPS}:/tmp/nirva-deploy.tar.gz"
  ssh "${SSH_OPTS[@]}" "$VPS" "mkdir -p ${APP_DIR} && tar -xzf /tmp/nirva-deploy.tar.gz -C ${APP_DIR} && rm /tmp/nirva-deploy.tar.gz"
  rm -f "$TAR"
fi

echo "→ รัน deploy บน VPS (~10-15 นาที — ดู docker build)..."
ssh -t "${SSH_OPTS[@]}" "$VPS" "chmod +x ${APP_DIR}/deploy/contabo/*.sh && bash ${APP_DIR}/deploy/contabo/remote-deploy.sh"

PORT=$(ssh "${SSH_OPTS[@]}" "$VPS" "cat ${APP_DIR}/env/.dashboard-port 2>/dev/null || echo 3100")

echo ""
echo "=== เสร็จ ==="
echo "Nirva: http://127.0.0.1:${PORT} (บน VPS)"
echo ""
echo "ขั้นต่อไป (บน VPS หลัง SSH):"
echo "  ssh ${VPS}"
echo "  bash ${APP_DIR}/deploy/contabo/vps-status.sh"
echo "  curl -s http://127.0.0.1:${PORT}/api/health | python3 -m json.tool"
echo ""
echo "DNS: ai.nirva.one → A → ${VPS_IP} (Cloudflare DNS only ชั่วคราว)"
echo "Proxy: bash ${APP_DIR}/deploy/contabo/wire-proxy.sh"
echo "Public: curl -s https://ai.nirva.one/api/health | python3 -m json.tool"
