# Troubleshooting Guide

Every issue below was **actually encountered during development** of this project, with the exact fix that worked. (Real troubleshooting experience — not copied from generic docs.)

---

## Quick Reference Table

| # | Error | Cause | Fix |
|---|---|---|---|
| 1 | `SSL: CERTIFICATE_VERIFY_FAILED` (macOS, Python) | python.org Python doesn't use system certificates | Run `Install Certificates.command` from the Python application folder |
| 2 | Slack `HTTP Error 404: Not Found` | Wrong/expired/truncated webhook URL | Regenerate webhook, use the **Copy** button, re-export variable |
| 3 | Grafana panel shows "No data" | `$image` variable used in query before creating it | Create the dashboard variable first, then use it in queries |
| 4 | Grafana can't connect to Prometheus | Data source URL set to `localhost:9090` | Use `http://prometheus:9090` (container name) — Grafana runs inside Docker |
| 5 | GitHub Actions build red | HIGH/CRITICAL CVEs in base image | Not an error — the gate working! Upgrade base image to fix |
| 6 | `Couldn't find any revision to build` (Jenkins) | Branch Specifier default is `*/master`, repo uses `main` | Change Branch Specifier to `*/main` |
| 7 | `docker: command not found` (Jenkins) | Jenkins service user lacks Docker access | `sudo usermod -aG docker jenkins && restart Jenkins`; macOS: ensure Docker Desktop running |
| 8 | `trivy: command not found` (Jenkins) | PATH differs for Jenkins service user | Use full path (`which trivy` → e.g. `/opt/homebrew/bin/trivy`) in Jenkinsfile |
| 9 | First scan extremely slow | CVE database (~500 MB) downloading | Normal, one-time; cached at `~/.cache/trivy` afterwards |
| 10 | `the attribute 'version' is obsolete` warning | Old `version: "3.8"` line in docker-compose.yml | Delete the line (harmless warning; newer Compose ignores it) |
| 11 | Environment variable "disappears" in new terminal | `export` is per-terminal-session only | Add export line to `~/.zshrc` (macOS) / `~/.bashrc` (Linux) |
| 12 | Pipeline stops when Slack fails | Notification error treated as fatal | Fixed in code: notification failures print a warning and `exit 0` (non-blocking) |

---

## Detailed Case Studies

### Case 1: macOS SSL Certificate Failure

**Symptom:** `slack_notify.py` crashed with a long traceback ending in `ssl.py ... do_handshake()`.

**Root cause:** Python installed from python.org on macOS ships without linking to system root certificates. Every HTTPS request fails at the TLS handshake.

**Fix:**
```bash
/Applications/Python\ 3.14/Install\ Certificates.command
```
One-time, system-wide fix. Alternative: `pip3 install certifi` and pass `ssl.create_default_context(cafile=certifi.where())` to `urlopen`.

---

### Case 2: Slack HTTP 404

**Symptom:** After fixing SSL, requests reached Slack but returned `HTTP Error 404: Not Found`.

**Root cause:** 404 from Slack means "this webhook does not exist" — the URL was invalid (truncated during copy, or webhook regenerated).

**Diagnosis method** — test the URL directly with curl before blaming code:
```bash
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"text": "🧪 test"}' "$SLACK_WEBHOOK_URL"
```

| curl response | Meaning |
|---|---|
| `ok` | URL valid — message delivered |
| `no_service` | Webhook deleted/URL wrong — regenerate |
| `invalid_token` | Last URL segment corrupted — re-copy |
| `channel_not_found` | Target channel deleted |

**Fix:** regenerated the webhook, used Slack's **Copy** button (not manual text selection), re-exported.

**Improvement made:** rewrote `slack_notify.py` so any notification failure prints a warning and exits `0` — the scan pipeline never stops because of an alerting problem. Design principle: *scan results are critical; alerts are best-effort.*

---

### Case 3: Grafana "No data" — Variable Ordering

**Symptom:** New dashboard panel with query `container_vulnerabilities{severity="critical", image=~"$image"}` showed "No data" despite metrics existing in Prometheus.

**Root cause:** the query referenced dashboard variable `$image` — but on a brand-new dashboard, that variable didn't exist yet. A non-existent variable makes the label filter match nothing.

**Debug method (works for any No-data case):**
1. Simplify the query — remove filters one by one: `container_vulnerabilities{severity="critical"}` → data appeared → filter was the problem
2. Verify at the source first: check http://localhost:9091 (Pushgateway) shows the metric, then query it raw in Prometheus (http://localhost:9090)
3. Check the time range — pushed metrics older than the selected window won't display

**Fix:** created the variable (Dashboard settings → Variables → Query type: Label values → label `image`, metric `container_vulnerabilities`, Multi-value + Include All), then restored the filtered query.

**Lesson:** variables must exist before queries reference them.

---

### Case 4: GitHub Actions Red Build = Success Story

**Symptom:** first pipeline run failed with `Error: Process completed with exit code 1`.

**Analysis of the log proved everything upstream worked:**
- Image built ✅ → CVE DB downloaded ✅ → Debian 13.1 detected, 87 packages scanned ✅ → exit code 1 = HIGH/CRITICAL found → **the security gate did exactly its job**

**Remediation:** upgraded the Dockerfile base `python:3.9-slim` → `python:3.12-slim`, added `ignore-unfixed: true` (blocking on unfixable CVEs is not actionable). Next build: green ✅.

This red→fix→green sequence is the core value demonstration of the project: vulnerable images cannot reach deployment.

---

## General Debugging Approach

1. **Read the actual error** — HTTP 404 vs SSL error vs exit code 1 each point to completely different layers (URL / certificates / scan findings)
2. **Test components in isolation** — curl for webhooks, raw Prometheus queries for dashboards, `which trivy` for PATH issues
3. **Check data at each pipeline hop** — script → Pushgateway (9091) → Prometheus (9090) → Grafana (3000); find the hop where data disappears
4. **Distinguish real failures from working safeguards** — a red build on a vulnerable image is the system succeeding