#!/bin/bash
# run_all_tests.sh - Poora pipeline har image par chalata hai
# Usage:
#   export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
#   ./scripts/run_all_tests.sh

cd "$(dirname "$0")/.."      # project root se chalao
source configs/scanner-config.env

# Aapki saari images ek jagah — yahan add/remove kar sakte ho
IMAGES=(
  "blue-green-deployment-backend:latest"
  "blue-green-deployment-frontend-blue:latest"
  "blue-green-deployment-frontend-green:latest"
  "streamingapp-assignment-hvc-admin:latest"
  "streamingapp-assignment-hvc-admin:latest"
  "streamingapp-assignment-hvc-auth:latest"
  "streamingapp-assignment-hvc-chat:latest"
  "streamingapp-assignment-hvc-frontend:latest"
  "streamingapp-assignment-hvc-streaming:latest"
  "myapp:latest"
  "python:3.4-alpine"        # deliberately old — FAIL dikhane ke liye
  "alpine:latest"            # clean — PASS dikhane ke liye
)

PASS_COUNT=0
FAIL_COUNT=0
RESULTS=""

echo "════════════════════════════════════════════"
echo "  FULL PIPELINE TEST — ${#IMAGES[@]} images"
echo "════════════════════════════════════════════"

for IMG in "${IMAGES[@]}"; do
    SAFE=$(echo "$IMG" | tr '/:' '__')
    echo ""
    echo "─────────────────────────────────────────"
    echo "🔍 [1/5] Scanning: $IMG"

    # 1. JSON report banao
    trivy image --quiet --format json --output "reports/$SAFE.json" "$IMG"

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

    # 4. Slack alert (test #5) — sirf tab jab webhook set hai
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        python3 notifications/slack_notify.py "reports/$SAFE.json"
        echo "💬 [4/5] Slack notified"
    else
        echo "⏭️  [4/5] Slack skipped (SLACK_WEBHOOK_URL not set)"
    fi

    # 5. Grafana metrics (test #6)
    python3 scripts/push_metrics.py "reports/$SAFE.json"
    echo "📊 [5/5] Metrics pushed to Grafana"
done

echo ""
echo "════════════════════════════════════════════"
echo "  FINAL SUMMARY"
echo "════════════════════════════════════════════"
echo -e "$RESULTS"
echo ""
echo "  Total: ${#IMAGES[@]} | Passed gate: $PASS_COUNT | Blocked: $FAIL_COUNT"
echo "  📊 Dashboard: http://localhost:3000"
echo "  📄 Reports:   reports/ folder"