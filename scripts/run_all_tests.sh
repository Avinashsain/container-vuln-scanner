#!/bin/bash
# run_all_tests.sh - Poora pipeline har image par chalata hai
# Usage:
#   export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
#   ./scripts/run_all_tests.sh

cd "$(dirname "$0")/.."      # project root se chalao
source configs/scanner-config.env

# Default images — jab user kuch bhi input na de to yeh use hongi
DEFAULT_IMAGES=(
  "blue-green-deployment-backend:latest"
  "blue-green-deployment-frontend-blue:latest"
  "blue-green-deployment-frontend-green:latest"
  "streamingapp-assignment-hv-admin:latest"
  "streamingapp-assignment-hv-auth:latest"
  "streamingapp-assignment-hv-chat:latest"
  "streamingapp-assignment-hv-frontend:latest"
  "streamingapp-assignment-hv-streaming:latest"
  "e-commercestore-cart-service:latest"
  "e-commercestore-frontend-service:latest"
  "e-commercestore-order-service:latest"
  "e-commercestore-product-service:latest"
  "e-commercestore-user-service:latest"
  "alpine:latest"
)

# Image input le lo — 3 tareeke se:
#   1. CLI args:      ./scripts/run_all_tests.sh img1:tag img2:tag
#   2. Interactive:    ./scripts/run_all_tests.sh   (phir prompt par single ya multiple image daalo)
#   3. Blank/Enter:    default list use hogi (upar wali)
if [ $# -gt 0 ]; then
    IMAGES=("$@")
else
    echo "════════════════════════════════════════════"
    echo "  IMAGE INPUT"
    echo "════════════════════════════════════════════"
    echo "Ek image daalo ya multiple images space/comma se separate karke."
    echo "Khali chhod ke Enter dabao to default ${#DEFAULT_IMAGES[@]} images scan hongi."
    read -rp "Image(s): " USER_INPUT

    if [ -z "$USER_INPUT" ]; then
        IMAGES=("${DEFAULT_IMAGES[@]}")
    else
        # Comma ko space mein convert karo, phir words mein split karo
        USER_INPUT=$(printf '%s' "$USER_INPUT" | tr ',' ' ')
        read -ra IMAGES <<< "$USER_INPUT"
    fi
fi

PASS_COUNT=0
FAIL_COUNT=0
RESULTS=""
REPORT_FILES=()

echo "════════════════════════════════════════════"
echo "  FULL PIPELINE TEST — ${#IMAGES[@]} images"
echo "════════════════════════════════════════════"

for IMG in "${IMAGES[@]}"; do
    SAFE=$(printf '%s' "$IMG" | tr '/:,' '__')
    REPORT_PATH="reports/$SAFE.json"
    REPORT_FILES+=("$REPORT_PATH")
    echo ""
    echo "─────────────────────────────────────────"
    echo "🔍 [1/5] Scanning: $IMG"

    # 1. JSON report banao
    trivy image --quiet --format json --output "$REPORT_PATH" "$IMG"

    # 2. Gate check (test #2 & #3 ki checklist)
    trivy image --quiet --exit-code 1 --severity "$FAIL_ON_SEVERITY" "$IMG" > /dev/null 2>&1
    GATE=$?
    if [ $GATE -eq 0 ]; then
        echo "✅ [2/5] Gate: PASS (exit=$GATE)"
        PASS_COUNT=$((PASS_COUNT+1))
        RESULTS="$RESULTS\n  ✅ PASS  $IMG"
    else
        echo "🚫 [2/5] Gate: BLOCKED (exit=$GATE) — HIGH/CRITICAL found"
        FAIL_COUNT=$((FAIL_COUNT+1))
        RESULTS="$RESULTS\n  ❌ FAIL  $IMG"
    fi

    # 3. HTML report (test #4)
    python3 scripts/generate_report.py "reports/$SAFE.json" "reports/$SAFE.html"
    echo "📄 [3/5] Report: reports/$SAFE.html"

    # 4. Grafana metrics (test #5)
    python3 scripts/push_metrics.py "$REPORT_PATH"
    echo "📊 [4/5] Metrics pushed to Grafana"
done

# 5. Slack alert — one consolidated summary for all images
if [ -n "$SLACK_WEBHOOK_URL" ]; then
    python3 notifications/slack_notify.py "${REPORT_FILES[@]}"
    echo "💬 [5/5] Slack notified"
else
    echo "⏭️  [5/5] Slack skipped (SLACK_WEBHOOK_URL not set)"
fi

echo ""
echo "════════════════════════════════════════════"
echo "  FINAL SUMMARY"
echo "════════════════════════════════════════════"
echo -e "$RESULTS"
echo ""
echo "  Total: ${#IMAGES[@]} | Passed gate: $PASS_COUNT | Blocked: $FAIL_COUNT"
echo "  📊 Dashboard: http://localhost:3000"
echo "  📄 Reports:   reports/ folder"