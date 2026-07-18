#!/bin/bash
# setup.sh - One-command project setup
set -e
echo "🚀 Container Vulnerability Scanner — Setup"

# 1. Check prerequisites
for cmd in docker python3 trivy; do
    if ! command -v $cmd &> /dev/null; then
        echo "❌ '$cmd' is not installed. Please install it first (see docs/setup.md)."
        exit 1
    fi
    echo "✅ $cmd found"
done

# 2. Create needed folders
mkdir -p reports
echo "✅ Folders ready"

# 3. Download/refresh the vulnerability database
echo "📥 Updating vulnerability database..."
trivy image --download-db-only

# 4. Start monitoring stack
echo "🐳 Starting Prometheus + Grafana + Pushgateway..."
docker compose up -d

# 5. Run a smoke-test scan
echo "🧪 Test scan on alpine:latest..."
trivy image --format json --output reports/setup-test.json alpine:latest
python3 scripts/push_metrics.py reports/setup-test.json

echo ""
echo "🎉 Setup complete!"
echo "   Grafana:    http://localhost:3000  (admin / admin123)"
echo "   Prometheus: http://localhost:9090"
echo "   Run a scan: ./scripts/scan_image.sh <image-name>"