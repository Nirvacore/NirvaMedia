#!/bin/bash
# Load testing script for NMD Platform

set -e

API_URL="${1:-http://localhost:3000}"
API_KEY="${2:-test-api-key}"
DURATION="${3:-60}"
CONCURRENCY="${4:-10}"

echo "════════════════════════════════════════════════════════════"
echo "NMD Platform - Load Testing"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "API URL: $API_URL"
echo "Duration: ${DURATION}s"
echo "Concurrency: $CONCURRENCY"
echo ""

# Install Apache Bench if not present
if ! command -v ab &> /dev/null; then
    echo "Installing Apache Bench..."
    apt-get update
    apt-get install -y apache2-utils
fi

# Test endpoints
ENDPOINTS=(
    "/health"
    "/content"
    "/templates"
    "/metrics"
    "/search"
    "/analytics/dashboard"
)

echo "Running load tests..."
echo ""

for endpoint in "${ENDPOINTS[@]}"; do
    echo "Testing: $endpoint"
    
    ab -n 1000 \
       -c $CONCURRENCY \
       -H "Authorization: Bearer $API_KEY" \
       -H "Content-Type: application/json" \
       -t $DURATION \
       "$API_URL$endpoint" 2>/dev/null | grep -E "Requests per second|Time per request|Failed requests"
    
    echo ""
done

echo "════════════════════════════════════════════════════════════"
echo "Load testing complete!"
echo "════════════════════════════════════════════════════════════"
