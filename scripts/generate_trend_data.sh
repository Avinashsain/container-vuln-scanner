#!/bin/bash
# generate_trend_data.sh - Har 60 sec mein saari images scan karke push karta hai
# 10 rounds = 10 minute ka trend data. Demo se pehle chalao.
cd "$(dirname "$0")/.."

IMAGES=(
    #"myapp:latest"
    #"python:3.4-alpine"
    "alpine:latest"
    #blue-green-deployment ke liye images
    "blue-green-deployment-backend:latest"
    "blue-green-deployment-frontend-blue:latest"
    "blue-green-deployment-frontend-green:latest"
    #streamingapp-assignment-hv ke liye images
    "streamingapp-assignment-hv-admin:latest"
    "streamingapp-assignment-hv-auth:latest"
    "streamingapp-assignment-hv-chat:latest"
    "streamingapp-assignment-hv-frontend:latest"
    "streamingapp-assignment-hv-streaming:latest"
)

ROUNDS=10
for ROUND in $(seq 1 $ROUNDS); do
    echo "═══ Round $ROUND of $ROUNDS ═══"
    for IMG in "${IMAGES[@]}"; do
        SAFE=$(echo "$IMG" | tr '/:' '__')
        trivy image --quiet --format json --output "reports/$SAFE.json" "$IMG"
        python3 scripts/push_metrics.py "reports/$SAFE.json"
    done
    echo "⏳ 60 sec wait..."
    sleep 60
done
echo "✅ Done! Grafana mein 'Last 15 minutes' select karke dekho."