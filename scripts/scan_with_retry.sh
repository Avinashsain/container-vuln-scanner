#!/bin/bash
# scan_with_retry.sh - retries the scan on operational errors only
IMAGE=$1
MAX_RETRIES=3
RETRY_DELAY=10   # seconds

for ATTEMPT in $(seq 1 $MAX_RETRIES); do
    echo "🔄 Attempt $ATTEMPT of $MAX_RETRIES ..."

    trivy image --exit-code 1 --severity HIGH,CRITICAL "$IMAGE"
    CODE=$?

    if [ $CODE -eq 0 ]; then
        echo "✅ Scan passed."
        exit 0
    elif [ $CODE -eq 1 ]; then
        echo "🚫 Vulnerabilities found — NOT retrying (this is a real failure)."
        exit 1
    else
        echo "⚠️  Operational error (exit $CODE) — maybe network/DB issue."
        if [ $ATTEMPT -lt $MAX_RETRIES ]; then
            echo "   Waiting ${RETRY_DELAY}s before retry..."
            sleep $RETRY_DELAY
        fi
    fi
done

echo "❌ Scan failed after $MAX_RETRIES attempts."
exit 2