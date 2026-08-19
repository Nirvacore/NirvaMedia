#!/usr/bin/env bash
# Print Manus publish settings — copy/paste into Manus project UI
set -euo pipefail

cat <<'EOF'
╔══════════════════════════════════════════════════════════════╗
║  Nirva AI — Manus Publish Config (v1.0.0)                    ║
╚══════════════════════════════════════════════════════════════╝

GitHub repo:  Nirvacore/nirva-AI
Branch:       main  (v1.0.0 — Brain OS complete)

── BUILD COMMAND ──────────────────────────────────────────────
pnpm install --frozen-lockfile && pnpm build

── START COMMAND ──────────────────────────────────────────────
bash deploy/manus/start.sh

── ENVIRONMENT (paste all lines) ──────────────────────────────
PUBLIC_URL=https://ai.nirva.one
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
DATABASE_PATH=/app/data/nirva.db
VITE_OAUTH_PORTAL_URL=https://manus.im
VITE_APP_ID=c94nssM6mCHuLojjUFdQbn
OAUTH_CALLBACK_PATH=/manus-oauth/callback
VITE_OAUTH_CALLBACK_PATH=/manus-oauth/callback
ALLOW_DEMO_AUTH=false
CORS_ORIGINS=https://ai.nirva.one

── AFTER PUBLISH — verify ─────────────────────────────────────
curl -s https://ai.nirva.one/api/health | python3 -m json.tool
bash scripts/verify-production.sh https://ai.nirva.one

Expected: "version": "1.0.0", "status": "healthy"

── NEW PAGES (v1.0) ───────────────────────────────────────────
/brains       — Brain Marketplace
/providers    — LLM Provider Hub
/workspace    — Idea → Deploy
/enterprise   — SSO, ERP, Audit, Billing

── LOGS must show ─────────────────────────────────────────────
Server running on http://0.0.0.0:3000/

EOF
