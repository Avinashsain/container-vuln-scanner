# Setup Guide

Complete installation instructions for all platforms. This project was developed and tested on **macOS**, with Linux/Windows instructions included.

## Prerequisites Overview

| Tool | Purpose | Version Used |
|---|---|---|
| Docker Desktop | Run containers, build images, host monitoring stack | Latest |
| Python 3 | Scripting (parsing, reports, alerts, metrics) | 3.14 |
| Trivy | Vulnerability scanner (CVE database) | 0.72.0 |
| Git | Version control & CI/CD integration | Any recent |
| Jenkins | Local CI/CD server (optional if using GitHub Actions only) | LTS |

---

## 1. Docker

### macOS
1. Download Docker Desktop: https://www.docker.com/products/docker-desktop
2. Install and launch it (whale icon in menu bar must be running)

### Linux (Ubuntu)
```bash
sudo apt update
sudo apt install -y docker.io docker-compose
sudo usermod -aG docker $USER   # run docker without sudo
# Log out and back in
```

### Verify
```bash
docker --version
docker run hello-world
```

📸 **[SCREENSHOT 3: `docker run hello-world` ka successful output]**

---

## 2. Python 3

### macOS
Download from https://python.org and install.

> ⚠️ **Important (macOS only):** After installing Python from python.org, you MUST run the certificate installer, otherwise all HTTPS calls (Slack, etc.) fail with `SSL: CERTIFICATE_VERIFY_FAILED`:
> ```bash
> /Applications/Python\ 3.14/Install\ Certificates.command
> ```
> (We hit this exact issue during development — see troubleshooting.md)

### Linux
```bash
sudo apt install -y python3 python3-pip
```

### Verify
```bash
python3 --version   # 3.8+
```

---

## 3. Trivy

### macOS
```bash
brew install trivy
```

### Linux (Ubuntu/Debian)
```bash
sudo apt install -y wget apt-transport-https gnupg lsb-release
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee /etc/apt/sources.list.d/trivy.list
sudo apt update && sudo apt install -y trivy
```

### Windows
Download the `.zip` from Trivy GitHub Releases, extract, add folder to PATH.

### Verify + first database download
```bash
trivy --version
trivy image --download-db-only    # downloads ~500 MB CVE DB (one-time, then cached)
```

> **Note:** The first scan is slow because the CVE database (~500 MB) downloads. All later scans use the local cache at `~/.cache/trivy` and are fast.

---

## 4. Monitoring Stack (Prometheus + Grafana + Pushgateway)

All three run as containers via Docker Compose — nothing to install manually.

```bash
cd container-vuln-scanner
docker compose up -d
docker compose ps    # all 3 services should show "Up"
```

📸 **[SCREENSHOT 4: `docker compose ps` output — teeno containers Up dikhte hue]**

| Service | URL | Purpose |
|---|---|---|
| Grafana | http://localhost:3000 | Dashboard UI (admin / admin123) |
| Prometheus | http://localhost:9090 | Time-series metrics database |
| Pushgateway | http://localhost:9091 | Receives metrics from scan scripts |

---

## 5. Jenkins (Native Installation)

We used a **native Jenkins install** (not Docker) running at http://localhost:8080.

macOS:
```bash
brew install jenkins-lts
brew services start jenkins-lts
```

After first launch:
1. Open http://localhost:8080
2. Paste the initial admin password (path shown on screen)
3. Choose **Install suggested plugins** (includes Pipeline + Git — all we need)
4. Create admin user

**Additional plugin (optional but recommended):** `HTML Publisher` — shows vulnerability HTML reports directly on the Jenkins build page.

**Verify Jenkins can access Docker & Trivy** — create a test Freestyle job with an *Execute shell* step:
```bash
docker --version
trivy --version
```
Both versions printing = ready.

---

## 6. Slack Webhook (for notifications)

1. Go to https://api.slack.com/apps → **Create New App → From scratch**
2. Left menu → **Incoming Webhooks** → toggle **On**
3. **Add New Webhook to Workspace** → select channel → Allow
4. Use the **Copy button** next to the URL (manual select-copy can truncate it!)
5. Export it (never commit to Git):
```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/T.../B.../..."
```
6. Make it permanent (macOS zsh):
```bash
echo 'export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."' >> ~/.zshrc
source ~/.zshrc
```

**Test it before using:**
```bash
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"text": "🧪 test"}' "$SLACK_WEBHOOK_URL"
# Expected response: ok
```

📸 **[SCREENSHOT 5: Slack channel mein aaya hua test/alert message]**

---

## 7. One-Command Setup

Once prerequisites are installed:

```bash
./setup.sh
```

This script:
1. Checks docker / python3 / trivy are installed
2. Creates the `reports/` folder
3. Downloads/refreshes the CVE database
4. Starts the monitoring stack (`docker compose up -d`)
5. Runs a smoke-test scan on `alpine:latest` and pushes metrics

📸 **[SCREENSHOT 6: setup.sh ka pura output — "🎉 Setup complete!" tak]**
