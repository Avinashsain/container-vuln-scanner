#!/bin/bash
# daily_scan.sh - scans a list of images and sends one Slack summary
cd "$(dirname "$0")/.."          # move to project root
source configs/scanner-config.env

IMAGES=("myapp:latest" "nginx:latest" "alpine:latest")

for IMG in "${IMAGES[@]}"; do
    SAFE=$(echo "$IMG" | tr '/:' '__')
    trivy image --format json --output "reports/daily-$SAFE.json" "$IMG"
    python3 notifications/slack_notify.py "reports/daily-$SAFE.json"
    python3 scripts/push_metrics.py "reports/daily-$SAFE.json"
done