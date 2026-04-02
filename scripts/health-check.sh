#!/bin/bash

# Health check script

set -e

HEALTH_URL="${1:-http://localhost:3000/health}"
MAX_ATTEMPTS=30
ATTEMPT=0

echo "🏥 Health Check"
echo "URL: $HEALTH_URL"
echo ""

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))
    
    if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
        echo "✅ Service is healthy"
        exit 0
    fi
    
    echo "⏳ Attempt $ATTEMPT/$MAX_ATTEMPTS..."
    sleep 2
done

echo "❌ Service failed to become healthy"
exit 1
