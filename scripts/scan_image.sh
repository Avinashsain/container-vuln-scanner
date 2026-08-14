#!/bin/bash
# scan_image.sh - Scans an image and fails if threshold exceeded
# Usage: ./scripts/scan_image.sh myapp:latest

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

IMAGE=$1
if [ -z "$IMAGE" ]; then
    echo "❌ Usage: ./scan_image.sh <image-name>"
    exit 1
fi

# Load configuration from the repository root regardless of the caller's cwd.
source "${REPO_ROOT}/configs/scanner-config.env"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SAFE_NAME=$(echo "$IMAGE" | tr '/:' '__')   # replace / and : for filename
REPORT_DIR="${REPO_ROOT}/${REPORT_DIR}"
mkdir -p "$REPORT_DIR"
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

# 2) Slack alert with the severity breakdown from the report
if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
    python3 notifications/slack_notify.py "$REPORT_FILE"
else
    echo "⏭️  Slack skipped (SLACK_WEBHOOK_URL not set)"
fi

# 3) Now run the gate check — this exits non-zero on violations
trivy image --exit-code 1 --severity "$FAIL_ON_SEVERITY" $EXTRA_FLAGS "$IMAGE"

echo "✅ Image passed the security gate!"