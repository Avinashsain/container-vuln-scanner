#!/bin/bash
# scan_image.sh - Scans an image and fails if threshold exceeded
# Usage: ./scripts/scan_image.sh myapp:latest

set -e  # stop the script on any error

IMAGE=$1
if [ -z "$IMAGE" ]; then
    echo "❌ Usage: ./scan_image.sh <image-name>"
    exit 1
fi

# Load configuration
source configs/scanner-config.env

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SAFE_NAME=$(echo "$IMAGE" | tr '/:' '__')   # replace / and : for filename
REPORT_FILE="$REPORT_DIR/${SAFE_NAME}-${TIMESTAMP}.json"

echo "🔍 Scanning image: $IMAGE"
echo "📋 Fail threshold: $FAIL_ON_SEVERITY"

# Build extra flags
EXTRA_FLAGS=""
if [ "$IGNORE_UNFIXED" = "true" ]; then
    EXTRA_FLAGS="--ignore-unfixed"
fi

# 1) Always save a full JSON report (all severities) for records
trivy image --format json --output "$REPORT_FILE" "$IMAGE"
echo "📄 Report saved: $REPORT_FILE"

# 2) Now run the gate check — this exits non-zero on violations
trivy image --exit-code 1 --severity "$FAIL_ON_SEVERITY" $EXTRA_FLAGS "$IMAGE"

echo "✅ Image passed the security gate!"