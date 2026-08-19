#!/usr/bin/env bash
# Manus Space / Cloud Run — production start command
# Set as Start Command in Manus project settings:
#   bash deploy/manus/start.sh
set -euo pipefail
cd "$(dirname "$0")/../.."

export NODE_ENV=production
export PORT="${PORT:-3000}"
export HOST="${HOST:-0.0.0.0}"
export DATABASE_PATH="${DATABASE_PATH:-/app/data/nirva.db}"

mkdir -p "$(dirname "$DATABASE_PATH")"

if [ ! -f dist/index.js ]; then
  echo "→ Building..."
  pnpm install --frozen-lockfile
  pnpm build
fi

echo "→ Starting Nirva AI on $HOST:$PORT"
exec node dist/index.js
