#!/usr/bin/env bash
# แก้ repo บน Mac ที่ pull ไม่ได้ แล้ว deploy ทันที
# Usage: cd ~/nirva-AI && bash scripts/mac-fix-and-deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== Mac fix + deploy ==="
echo "Repo: $ROOT"
echo ""

# ตรวจ remote
REMOTE=$(git remote get-url origin 2>/dev/null || echo "")
echo "Remote: ${REMOTE:-ไม่มี}"

if [[ "$REMOTE" != *"Nirvacore"* ]] && [[ "$REMOTE" != *"nirva"* ]]; then
  echo "⚠ remote อาจผิด — ตั้งใหม่:"
  echo "  git remote set-url origin https://github.com/Nirvacore/nirva-AI.git"
fi

echo "→ fetch + reset เป็น main ล่าสุด..."
git fetch origin main
git checkout main 2>/dev/null || git checkout -b main origin/main
git reset --hard origin/main

if [ ! -f scripts/deploy-now.sh ]; then
  echo "✗ ยังไม่มี scripts/deploy-now.sh — ลอง clone ใหม่:"
  echo "  cd ~ && mv nirva-AI nirva-AI.bak.\$(date +%s) && git clone https://github.com/Nirvacore/nirva-AI.git && cd nirva-AI && bash scripts/mac-fix-and-deploy.sh"
  exit 1
fi

echo "✓ โค้ดล่าสุด: $(git log -1 --oneline)"
echo ""
bash scripts/deploy-now.sh
