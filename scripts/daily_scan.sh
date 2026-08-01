#!/bin/bash
# daily_scan.sh - scans a list of images and sends one Slack summary
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${REPO_ROOT}"

if [[ -f "${REPO_ROOT}/configs/scanner-config.env" ]]; then
    source "${REPO_ROOT}/configs/scanner-config.env"
else
    echo "❌ Missing config: ${REPO_ROOT}/configs/scanner-config.env" >&2
    exit 1
fi

mkdir -p "${REPO_ROOT}/reports"

IMAGES=("myapp:latest" "nginx:latest" "alpine:latest")
REPORT_FILES=()

for IMG in "${IMAGES[@]}"; do
    SAFE=$(echo "$IMG" | tr '/:' '__')
    REPORT_FILE="${REPO_ROOT}/reports/daily-${SAFE}.json"
    REPORT_FILES+=("${REPORT_FILE}")

    trivy image --format json --output "${REPORT_FILE}" "$IMG"
    python3 "${REPO_ROOT}/scripts/push_metrics.py" "${REPORT_FILE}"
done

if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
    python3 "${REPO_ROOT}/notifications/slack_notify.py" "${REPORT_FILES[@]}"
else
    echo "⏭️  Slack skipped (SLACK_WEBHOOK_URL not set)"
fi