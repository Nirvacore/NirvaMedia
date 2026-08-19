#!/usr/bin/env bash
# Nirva AI — เริ่มระบบด้วยคำสั่งเดียว
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "╔══════════════════════════════════════╗"
echo "║   Nirva AI Dashboard — Quick Start   ║"
echo "╚══════════════════════════════════════╝"
echo ""

# 1. Environment
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✓ สร้าง .env จาก .env.example"
else
  echo "✓ พบ .env แล้ว"
fi

# 2. Data directory
mkdir -p data
echo "✓ โฟลเดอร์ data/ พร้อม"

# 3. Dependencies
if [ ! -d node_modules ]; then
  echo "→ ติดตั้ง dependencies (pnpm install)..."
  pnpm install
else
  echo "✓ dependencies พร้อม"
fi

# 4. Build if needed
if [ ! -f dist/index.js ]; then
  echo "→ build ครั้งแรก (ใช้เวลา ~30 วินาที)..."
  pnpm build:full
else
  echo "✓ build พร้อม (dist/)"
fi

PORT="${PORT:-3000}"
echo ""
echo "🌿 เริ่มระบบที่ http://localhost:${PORT}"
echo "   Demo Hub → http://localhost:${PORT}/demo"
echo "   API Docs → http://localhost:${PORT}/api/docs"
echo ""
echo "กด Ctrl+C เพื่อหยุด"
echo ""

export NODE_ENV=production
export ALLOW_DEMO_AUTH=true
exec node dist/index.js
