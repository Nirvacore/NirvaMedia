#!/usr/bin/env bash
# One-shot bootstrap for Contabo Singapore VPS — ai.nirva.one
# VPS: 62.146.233.240 (Ubuntu 24.04, Singapore)
# Run ON THE VPS as root:
#   curl -fsSL https://raw.githubusercontent.com/Nirvacore/nirva-AI/main/deploy/contabo/bootstrap-vps.sh | bash
# Or after clone:
#   sudo bash deploy/contabo/bootstrap-vps.sh
set -euo pipefail

VPS_IP="${VPS_IP:-62.146.233.240}"
APP_DIR="${APP_DIR:-/opt/nirva-AI}"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Nirva AI v1.0 — Contabo Bootstrap                       ║"
echo "║  VPS: $VPS_IP (Singapore)                                ║"
echo "╚══════════════════════════════════════════════════════════╝"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo bash $0"
  exit 1
fi

# Warn if something else listens on public :3000
if ss -tlnp 2>/dev/null | grep -q '0.0.0.0:3000'; then
  echo "⚠ Port 3000 is in use (public). Nirva uses 127.0.0.1:3000 behind Nginx."
  echo "  Check: ss -tlnp | grep 3000"
  echo "  Stop conflicting service if deploy fails."
fi

if [ ! -d "$APP_DIR/.git" ]; then
  git clone https://github.com/Nirvacore/nirva-AI.git "$APP_DIR"
fi

cd "$APP_DIR"
git pull origin main

bash deploy/contabo/install.sh
bash deploy/contabo/deploy.sh

echo ""
echo "=== Local health (on VPS) ==="
curl -s http://127.0.0.1:3000/api/health | python3 -m json.tool 2>/dev/null || curl -s http://127.0.0.1:3000/api/health
echo ""

echo ""
echo "=== DNS (do in Cloudflare / registrar) ==="
echo "  ai.nirva.one  A  →  $VPS_IP"
echo "  (Gray cloud / DNS only for first certbot run)"
echo ""
echo "=== After DNS propagates ==="
echo "  certbot --nginx -d ai.nirva.one"
echo ""
echo "=== Pull Ollama models ==="
echo "  docker exec -it \$(docker ps -qf name=ollama) ollama pull llama3.1:8b"
echo "  docker exec -it \$(docker ps -qf name=ollama) ollama pull nomic-embed-text"
echo ""
echo "=== Verify from your Mac ==="
echo "  curl -s https://ai.nirva.one/api/health | python3 -m json.tool"
echo "  bash scripts/verify-production.sh https://ai.nirva.one"
