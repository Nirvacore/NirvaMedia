#!/usr/bin/env bash
# One-time setup on your Mac — enables GitHub Actions → auto deploy to Contabo
# Usage: bash scripts/setup-contabo-auto-deploy.sh
set -euo pipefail

VPS_IP="${VPS_IP:-62.146.233.240}"
VPS_USER="${VPS_USER:-root}"
KEY_PATH="${KEY_PATH:-$HOME/.ssh/nirva_contabo_deploy}"
REPO="${GITHUB_REPOSITORY:-Nirvacore/nirva-AI}"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Nirva AI — Auto Deploy Setup (ครั้งเดียว ~2 นาที)           ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "VPS: ${VPS_USER}@${VPS_IP}"
echo "Repo: ${REPO}"
echo ""

# 1. SSH key for GitHub Actions
if [ ! -f "$KEY_PATH" ]; then
  echo "→ สร้าง SSH key สำหรับ deploy..."
  ssh-keygen -t ed25519 -f "$KEY_PATH" -N "" -C "github-actions-nirva-deploy"
else
  echo "✓ มี key อยู่แล้ว: $KEY_PATH"
fi

echo ""
echo "── ขั้นที่ 1: ใส่ public key บน VPS (รันคำสั่งนี้ ใส่รหัส root ถ้าถาม) ──"
echo ""
echo "ssh-copy-id -i ${KEY_PATH}.pub ${VPS_USER}@${VPS_IP}"
echo ""
read -r -p "กด Enter หลังรัน ssh-copy-id สำเร็จแล้ว (หรือ g ข้ามถ้าทำแล้ว): " _

# Test SSH
echo "→ ทดสอบ SSH..."
if ssh -i "$KEY_PATH" -o BatchMode=yes -o StrictHostKeyChecking=accept-new "${VPS_USER}@${VPS_IP}" "echo OK" 2>/dev/null; then
  echo "✓ SSH key ใช้งานได้"
else
  echo "✗ SSH ยังไม่ได้ — รัน ssh-copy-id ด้านบนก่อน"
  exit 1
fi

# Prepare VPS directory
echo "→ สร้าง /opt/nirva-AI บน VPS..."
ssh -i "$KEY_PATH" "${VPS_USER}@${VPS_IP}" "mkdir -p /opt/nirva-AI"

# 2. GitHub Secrets
PRIVATE_KEY=$(cat "$KEY_PATH")

echo ""
echo "── ขั้นที่ 2: ตั้ง GitHub Secrets ──"
echo ""

if command -v gh &>/dev/null && gh auth status &>/dev/null 2>&1; then
  echo "→ ใช้ gh CLI ตั้ง secrets..."
  gh secret set CONTABO_HOST --body "$VPS_IP" --repo "$REPO"
  gh secret set CONTABO_USER --body "$VPS_USER" --repo "$REPO"
  gh secret set CONTABO_SSH_KEY --body "$PRIVATE_KEY" --repo "$REPO"
  echo "✓ Secrets ตั้งแล้ว"
else
  echo "ตั้ง manual ที่: https://github.com/${REPO}/settings/secrets/actions"
  echo ""
  echo "CONTABO_HOST = ${VPS_IP}"
  echo "CONTABO_USER = ${VPS_USER}"
  echo "CONTABO_SSH_KEY = (เนื้อหาไฟล์ด้านล่าง)"
  echo ""
  echo "----- BEGIN PRIVATE KEY -----"
  echo "$PRIVATE_KEY"
  echo "----- END PRIVATE KEY -----"
fi

echo ""
echo "── ขั้นที่ 3: Deploy ครั้งแรก (อัตโนมัติ) ──"
echo ""
echo "ไปที่: https://github.com/${REPO}/actions/workflows/deploy-contabo.yml"
echo "กด 'Run workflow' → branch main"
echo ""
echo "หรือ push ขึ้น main จะ deploy อัตโนมัติทุกครั้ง"
echo ""
echo "── ขั้นที่ 4: DNS ──"
echo "Cloudflare: ai.nirva.one A → ${VPS_IP} (gray cloud ชั่วคราว)"
echo ""
echo "── ตรวจหลัง deploy ──"
echo "curl -s https://ai.nirva.one/api/health | python3 -m json.tool"
echo ""
echo "✓ Setup เสร็จ — หลังนี้ push main = deploy เอง"
