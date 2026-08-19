#!/usr/bin/env bash
# Verify production deploy — run after Contabo/Manus deploy
# Usage: bash scripts/verify-production.sh [BASE_URL]
set -euo pipefail

BASE="${1:-https://ai.nirva.one}"
PASS=0
FAIL=0

check() {
  local name="$1"
  local url="$2"
  local expect="${3:-200}"
  local code
  code=$(curl -sS -o /tmp/nirva-verify-body.txt -w "%{http_code}" "$url" || echo "000")
  if [ "$code" = "$expect" ]; then
    echo "✓ $name — HTTP $code"
    PASS=$((PASS + 1))
  else
    echo "✗ $name — HTTP $code (expected $expect)"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== Nirva AI Production Verify ==="
echo "Base: $BASE"
echo ""

check "Health API" "$BASE/api/health"
HEALTH_CODE=$(curl -sS -o /tmp/nirva-health.json -w "%{http_code}" "$BASE/api/health" || echo "000")
if [ "$HEALTH_CODE" = "200" ]; then
  echo "✓ Health API — HTTP 200"
  PASS=$((PASS + 1))
else
  echo "✗ Health API — HTTP $HEALTH_CODE (expected 200)"
  FAIL=$((FAIL + 1))
fi

check "Demo Hub" "$BASE/demo"
check "Chat" "$BASE/chat"
check "Orchestration" "$BASE/orchestration"
check "API Docs" "$BASE/api/docs"
check "OpenAPI JSON" "$BASE/api/openapi.json"
check "Enterprise" "$BASE/enterprise"
check "Brains" "$BASE/brains"
check "Workspace" "$BASE/workspace"

echo ""
if [ -f /tmp/nirva-health.json ] && head -c 1 /tmp/nirva-health.json | grep -q '{' 2>/dev/null; then
  if grep -q '"version"' /tmp/nirva-health.json 2>/dev/null; then
    VERSION=$(python3 -c "import json; print(json.load(open('/tmp/nirva-health.json'))['version'])" 2>/dev/null || echo "unknown")
    echo "API version: $VERSION"
    if echo "$VERSION" | grep -qE '^(0\.(1[5-9]|[2-9][0-9])|1\.)'; then
      echo "✓ Version OK ($VERSION)"
      PASS=$((PASS + 1))
    else
      echo "✗ Version too old: $VERSION (need 0.15+ or 1.0.0)"
      FAIL=$((FAIL + 1))
    fi
  else
    echo "✗ /api/health did not return JSON (Manus 500?)"
    head -c 200 /tmp/nirva-health.json
    echo ""
    FAIL=$((FAIL + 1))
  fi
fi

echo ""
echo "=== Result: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ]
