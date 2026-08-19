#!/usr/bin/env bash
# Wire ai.nirva.one → Nirva dashboard via existing Traefik/nginx on VPS
# Run on VPS after remote-deploy succeeds
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/nirva-AI}"
PORT=$(cat "${APP_DIR}/env/.dashboard-port" 2>/dev/null || echo 3100)
GATEWAY=$(docker network inspect bridge -f '{{(index .IPAM.Config 0).Gateway}}' 2>/dev/null || echo "172.17.0.1")

echo "=== wire-proxy: ai.nirva.one → ${GATEWAY}:${PORT} ==="

render_config() {
  sed "s/__PORT__/${PORT}/g; s/__GATEWAY__/${GATEWAY}/g" "${APP_DIR}/deploy/contabo/traefik-nirva-ai.yaml"
}

# 1) Traefik dynamic folder
CONFIG_DIR=""
for d in /opt/nirvacore/traefik/dynamic /opt/traefik/dynamic /etc/traefik/dynamic /root/traefik/dynamic; do
  if [ -d "$d" ]; then CONFIG_DIR="$d"; break; fi
done

if [ -z "$CONFIG_DIR" ]; then
  TRAEFIK=$(docker ps --format '{{.Names}}' | grep -iE 'traefik|proxy' | head -1 || true)
  if [ -n "$TRAEFIK" ]; then
    CONFIG_DIR=$(docker inspect "$TRAEFIK" --format '{{range .Mounts}}{{if or (eq .Destination "/etc/traefik/dynamic") (eq .Destination "/dynamic")}}{{.Source}}{{end}}{{end}}' 2>/dev/null | head -1)
  fi
fi

if [ -n "$CONFIG_DIR" ] && [ -d "$CONFIG_DIR" ]; then
  render_config > "${CONFIG_DIR}/nirva-ai.yaml"
  echo "✓ Traefik dynamic config → ${CONFIG_DIR}/nirva-ai.yaml"
  echo "  (Traefik reloads automatically)"
  exit 0
fi

# 2) Try connecting dashboard to traefik docker network + labels (advanced)
TRAEFIK_NET=$(docker network ls --format '{{.Name}}' | grep -iE 'traefik|nirvacore|web' | head -1 || true)
DASH_CONTAINER=$(docker ps --format '{{.Names}}' | grep -E 'nirva-ai.*dashboard|dashboard' | head -1 || true)

if [ -n "$TRAEFIK_NET" ] && [ -n "$DASH_CONTAINER" ]; then
  docker network connect "$TRAEFIK_NET" "$DASH_CONTAINER" 2>/dev/null || true
  echo "✓ Connected ${DASH_CONTAINER} to network ${TRAEFIK_NET}"
  echo "  Add Traefik labels to dashboard service in docker-compose if routes missing"
fi

# 3) Standalone nginx (only if host nginx owns 80)
if command -v nginx &>/dev/null && ss -tlnp 2>/dev/null | grep nginx | grep -q ':80 '; then
  SITE="/etc/nginx/sites-available/ai.nirva.one"
  cat > "$SITE" <<EOF
upstream nirva_dashboard {
    server 127.0.0.1:${PORT};
}
server {
    listen 80;
    server_name ai.nirva.one;
    location / {
        proxy_pass http://nirva_dashboard;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
  ln -sf "$SITE" /etc/nginx/sites-enabled/ai.nirva.one 2>/dev/null || true
  nginx -t && systemctl reload nginx
  echo "✓ Nginx site ai.nirva.one → 127.0.0.1:${PORT}"
  exit 0
fi

echo ""
echo "⚠ Auto-proxy ไม่พบ Traefik dynamic folder / nginx"
echo "  ตั้ง manual: ai.nirva.one → http://${GATEWAY}:${PORT}"
echo "  Template: ${APP_DIR}/deploy/contabo/traefik-nirva-ai.yaml"
echo "  PORT=${PORT} GATEWAY=${GATEWAY}"
exit 0
