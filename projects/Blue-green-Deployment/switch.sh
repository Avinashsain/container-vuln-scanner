#!/usr/bin/env bash
# ─────────────────────────────────────────────
# switch.sh — Blue-Green Deployment Switcher
# Usage:  ./switch.sh blue | green | status
# ─────────────────────────────────────────────

set -euo pipefail

NAMESPACE="blue-green"
SVC="frontend-active"

BLUE_PORT=3100
GREEN_PORT=3200

usage() {
  echo "Usage: $0 {blue|green|status}"
  exit 1
}

get_current() {
  kubectl get svc "$SVC" -n "$NAMESPACE" \
    -o jsonpath='{.spec.selector.version}' 2>/dev/null || echo "unknown"
}

switch_to() {
  local VERSION="$1"
  local PORT

  if [[ "$VERSION" == "blue" ]]; then
    PORT=$BLUE_PORT
  elif [[ "$VERSION" == "green" ]]; then
    PORT=$GREEN_PORT
  else
    echo "ERROR: unknown version '$VERSION'. Use 'blue' or 'green'."
    exit 1
  fi

  echo "➡  Switching active traffic to: $VERSION (port $PORT)"

  kubectl patch svc "$SVC" -n "$NAMESPACE" \
    --type=merge \
    -p "{\"spec\":{\"selector\":{\"app\":\"frontend\",\"version\":\"$VERSION\"},\"ports\":[{\"protocol\":\"TCP\",\"port\":80,\"targetPort\":$PORT,\"nodePort\":30080}]}}"

  echo "Done. Verifying..."
  sleep 2
  CURRENT=$(get_current)
  echo "   Active deployment → $CURRENT"

  echo ""
  echo "Access the app:"
  minikube service "$SVC" -n "$NAMESPACE" --url 2>/dev/null || \
    echo "   Run: minikube service $SVC -n $NAMESPACE --url"
}

STATUS() {
  CURRENT=$(get_current)
  echo "Current active deployment: $CURRENT"
  echo ""
  echo "Pod status:"
  kubectl get pods -n "$NAMESPACE" -l app=frontend \
    -o custom-columns="NAME:.metadata.name,VERSION:.metadata.labels.version,STATUS:.status.phase,READY:.status.containerStatuses[0].ready"
}

# ── main ──────────────────────────────────────
case "${1:-}" in
  blue)   switch_to blue   ;;
  green)  switch_to green  ;;
  status) STATUS           ;;
  *)      usage            ;;
esac
