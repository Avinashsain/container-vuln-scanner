# 🛡️ Container Image Vulnerability Scanner with Reporting

An automated security tool that scans Docker container images for known vulnerabilities (CVEs), blocks insecure images in CI/CD pipelines, sends real-time Slack alerts, and tracks vulnerability trends on a Grafana dashboard.

> **Problem it solves:** DevOps teams often deploy container images without security checks, allowing known vulnerabilities to reach production. This tool ensures **only secure images are deployed** by integrating automated scanning directly into the build pipeline.

📸 **[SCREENSHOT 1: Grafana dashboard full view — saare 7 panels ke saath]**

---

## Architecture

```
             ┌──────────────────────────────────────────────────────┐
             │                    Developer pushes code             │
             └───────────────────────────┬──────────────────────────┘
                                         ▼
                     ┌──────────────────────────────────┐
                     │  CI/CD (Jenkins / GitHub Actions)│
                     │  1. docker build                 │
                     │  2. trivy scan  ──── FAIL? ─────►│──► ❌ Build blocked
                     └───────────────┬──────────────────┘
                                     │ PASS
                 ┌───────────────────┼───────────────────────┐
                 ▼                   ▼                        ▼
        ┌───────────────┐   ┌───────────────┐        ┌──────────────┐
        │ HTML / JSON   │   │ Slack         │        │ Pushgateway  │
        │ Reports       │   │ Notifications │        │      ▼       │
        └───────────────┘   └───────────────┘        │ Prometheus   │
                                                     │      ▼       │
                                                     │  Grafana 📊  │
                                                     └──────────────┘
```

**Flow:** Developer code push karta hai → CI/CD image build karti hai → Trivy scan karta hai → HIGH/CRITICAL vulnerabilities milne par build **block** ho jati hai → pass hone par reports bante hain, Slack alert jata hai, aur metrics Grafana dashboard par push hoti hain.

## Key Features

| Feature | Description |
|---|---|
| 🔍 Automated Scanning | Trivy-based CVE scanning of any Docker image |
| 🚦 Security Gate | Builds fail automatically on HIGH/CRITICAL vulnerabilities |
| ⚙️ Configurable Thresholds | Severity levels controlled via `configs/scanner-config.env` |
| 📄 Report Generation | Styled HTML + machine-readable JSON reports |
| 💬 Slack Notifications | Color-coded alerts (🔴 critical / 🟠 high / 🟢 clean) |
| 📊 Grafana Dashboard | Historical trends, per-image filters, severity breakdown |
| 🚫 Exception Management | `.trivyignore` for approved CVEs with expiry tracking |
| 🔁 Auto Rescanning | Change-detection rescans with alert-on-change only |
| ♻️ Retry Logic | Network failures retry; real vulnerabilities never do |

## Quick Start (3 commands)

```bash
git clone https://github.com/YOUR-USERNAME/container-vuln-scanner.git
cd container-vuln-scanner
./setup.sh
```

Then open:
- **Grafana dashboard:** http://localhost:3000 (admin / admin123)
- **Prometheus:** http://localhost:9090
- **Scan any image:** `./scripts/scan_image.sh <image-name>`

## Project Structure

```
container-vuln-scanner/
├── scripts/              # Scanning, reporting, metrics scripts
│   ├── scan_image.sh         # Single image scan with security gate
│   ├── scan_with_retry.sh    # Scan with smart retry logic
│   ├── parse_scan.py         # JSON report parser & summarizer
│   ├── generate_report.py    # HTML report generator
│   ├── push_metrics.py       # Grafana/Prometheus metrics pusher
│   ├── rescan.py             # Change-detection rescanner
│   ├── run_all_tests.sh      # End-to-end test suite (all images)
│   └── generate_trend_data.sh# Trend data generator for dashboard
├── notifications/
│   └── slack_notify.py       # Slack webhook alerting (non-blocking)
├── configs/
│   ├── scanner-config.env    # Severity thresholds & settings
│   ├── prometheus.yml        # Prometheus scrape config
│   └── exceptions.json       # Approved CVE exceptions with expiry
├── ci/
│   └── Jenkinsfile           # Jenkins pipeline (5 stages)
├── .github/workflows/
│   └── scan.yml              # GitHub Actions workflow
├── dashboards/
│   └── vuln-dashboard.json   # Exported Grafana dashboard
├── reports/                  # Generated scan reports (gitignored)
├── docs/                     # Full documentation
├── .trivyignore              # CVE exception list
├── docker-compose.yml        # Prometheus + Grafana + Pushgateway
├── Dockerfile                # Sample app image
└── setup.sh                  # One-command setup
```

## Tested With Real Projects

This scanner was validated against **11 real images**, including microservices from two other projects:

- ✅ Blue-Green Deployment project (backend + blue/green frontends) — integrated as a **pre-switch security check**: green environment only receives traffic after passing the security gate
- ✅ Streaming App (5 microservices: admin, auth, chat, frontend, streaming)
- ✅ Deliberately vulnerable image (`python:3.4-alpine`) to prove the gate blocks correctly

📸 **[SCREENSHOT 2: run_all_tests.sh ka FINAL SUMMARY output — PASS/FAIL list ke saath]**

## Documentation

| Document | Contents |
|---|---|
| [docs/setup.md](docs/setup.md) | Installation for macOS/Linux/Windows |
| [docs/usage.md](docs/usage.md) | Scanning, reports, thresholds, exceptions |
| [docs/ci-cd.md](docs/ci-cd.md) | Jenkins & GitHub Actions integration |
| [docs/troubleshooting.md](docs/troubleshooting.md) | Real errors faced & their fixes |

## Cost Optimization

- **100% free & open-source stack** — Trivy, Prometheus, Grafana, Jenkins: zero license cost
- **Localhost development** — no cloud VM bills
- **GitHub Actions free tier** — unlimited minutes for public repos
- **CVE database caching** — ~500 MB DB cached locally (`~/.cache/trivy`), avoiding repeated downloads; Trivy binary also cached in GitHub Actions (saves CI minutes)
- **Severity filtering** — scanning/alerting only HIGH/CRITICAL reduces noise and storage
- **Change-based alerting** — notifications only when counts change → less alert fatigue
- **Non-blocking notifications** — Slack failures never waste a CI re-run

## Tech Stack

Trivy · Docker · Python 3 · Bash · Jenkins · GitHub Actions · Prometheus · Pushgateway · Grafana · Slack API
