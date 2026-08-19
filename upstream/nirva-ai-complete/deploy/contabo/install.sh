#!/usr/bin/env bash
# Contabo VPS — first-time setup (Ubuntu 22.04/24.04)
# Run as root: bash deploy/contabo/install.sh
set -euo pipefail

echo "=== Nirva AI — Contabo VPS Install ==="

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo bash deploy/contabo/install.sh"
  exit 1
fi

apt-get update
apt-get install -y ca-certificates curl git nginx certbot python3-certbot-nginx

# Docker
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi

# Docker Compose plugin
if ! docker compose version &>/dev/null; then
  apt-get install -y docker-compose-plugin || true
fi

# App directory
APP_DIR="${APP_DIR:-/opt/nirva-AI}"
if [ ! -d "$APP_DIR/.git" ]; then
  git clone https://github.com/Nirvacore/nirva-AI.git "$APP_DIR"
fi

cd "$APP_DIR"

if [ ! -f env/contabo.prod.env ]; then
  cp env/contabo.prod.env.example env/contabo.prod.env
  echo "✓ Created env/contabo.prod.env — edit before going live"
fi

# Nginx site — start with HTTP, then certbot adds SSL
cp deploy/contabo/nginx-http.conf /etc/nginx/sites-available/ai.nirva.one
ln -sf /etc/nginx/sites-available/ai.nirva.one /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo ""
echo "=== Next steps ==="
echo "1. Point DNS: ai.nirva.one → A record → this server's IP"
echo "2. Edit: $APP_DIR/env/contabo.prod.env"
echo "3. Deploy: bash deploy/contabo/deploy.sh"
echo "4. SSL:    certbot --nginx -d ai.nirva.one"
echo "5. Ollama: docker exec -it \$(docker ps -qf name=ollama) ollama pull llama3.1:8b"
