#!/usr/bin/env bash
# Pick a free localhost port for Nirva dashboard (avoid nirvacore 3000-3001)
pick_dashboard_port() {
  local p
  for p in "${DASHBOARD_HOST_PORT:-}" 3100 3101 3102 3200 3002 3003; do
    [ -z "$p" ] && continue
    if ! ss -tlnp 2>/dev/null | grep -q ":${p} "; then
      echo "$p"
      return 0
    fi
  done
  echo 3100
}
