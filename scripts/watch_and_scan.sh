#!/bin/bash
# watch_and_scan.sh - watches the Docker daemon for new/tagged images and
# automatically scans + pushes metrics, so the Grafana dashboard updates
# without running scan_image.sh / push_metrics.py by hand.
# Usage: ./scripts/watch_and_scan.sh   (Ctrl+C to stop)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPORT_DIR="${REPO_ROOT}/reports"
mkdir -p "${REPORT_DIR}"

echo "👀 Watching for new/tagged Docker images (Ctrl+C to stop)..."

docker events --filter 'type=image' --filter 'event=tag' --format '{{json .}}' |
while IFS= read -r EVENT; do
    IMAGE=$(echo "$EVENT" | python3 -c "
import json, sys
try:
    print(json.load(sys.stdin)['Actor']['Attributes']['name'])
except Exception:
    pass
" 2>/dev/null)
    [ -z "$IMAGE" ] && continue

    echo "🆕 New image detected: ${IMAGE}"
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    SAFE_NAME=$(echo "$IMAGE" | tr '/:' '__')
    REPORT_FILE="${REPORT_DIR}/${SAFE_NAME}-${TIMESTAMP}.json"

    if trivy image --format json --output "${REPORT_FILE}" "$IMAGE"; then
        echo "📄 Report saved: ${REPORT_FILE}"
        if python3 "${REPO_ROOT}/scripts/push_metrics.py" "${REPORT_FILE}"; then
            echo "📊 Grafana updated for ${IMAGE}"
        else
            echo "⚠️  Metric push failed for ${IMAGE}"
        fi
    else
        echo "⚠️  Trivy scan failed for ${IMAGE}"
    fi
done
