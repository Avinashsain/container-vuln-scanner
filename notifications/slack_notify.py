#!/usr/bin/env python3
"""
slack_notify.py - Sends a scan summary to Slack.
Usage:
  export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
  python3 notifications/slack_notify.py reports/scan.json
"""
import json
import os
import sys
import urllib.request   # built-in, no pip install needed
import urllib.error

def build_summary(json_file):
    with open(json_file) as f:
        data = json.load(f)
    summary = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for result in data.get("Results", []):
        for v in result.get("Vulnerabilities", []) or []:
            sev = v.get("Severity", "UNKNOWN")
            if sev in summary:
                summary[sev] += 1
    return data.get("ArtifactName", "unknown"), summary

def send_to_slack(webhook_url, image, summary):
    # Pick emoji + alert level based on worst finding
    if summary["CRITICAL"] > 0:
        emoji, level = "🔴", "CRITICAL ALERT"
    elif summary["HIGH"] > 0:
        emoji, level = "🟠", "High severity found"
    else:
        emoji, level = "🟢", "Scan clean / low risk"

    message = {
        "text": f"{emoji} *{level}* — Image `{image}`\n"
                f"> Critical: *{summary['CRITICAL']}* | High: *{summary['HIGH']}* | "
                f"Medium: {summary['MEDIUM']} | Low: {summary['LOW']}"
    }

    req = urllib.request.Request(
        webhook_url,
        data=json.dumps(message).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        print(f"✅ Slack notified (HTTP {resp.status})")

if __name__ == "__main__":
    webhook = os.environ.get("SLACK_WEBHOOK_URL")
    if not webhook:
        print("⏭️  Slack skipped: SLACK_WEBHOOK_URL not set")
        sys.exit(0)   # not an error — notifications are optional

    if len(sys.argv) < 2:
        print("❌ Usage: python3 slack_notify.py <trivy-json-report>")
        sys.exit(1)

    try:
        image, summary = build_summary(sys.argv[1])
    except FileNotFoundError:
        print(f"❌ Report file not found: {sys.argv[1]}")
        sys.exit(1)
    except json.JSONDecodeError:
        print(f"❌ Invalid JSON in report file: {sys.argv[1]}")
        sys.exit(1)

    try:
        send_to_slack(webhook, image, summary)
    except urllib.error.HTTPError as e:
        # Slack ne request reject ki (404 = wrong URL, 400 = bad payload)
        print(f"⚠️  Slack rejected the request (HTTP {e.code})")
        if e.code == 404:
            print("   Hint: webhook URL galat/expired hai — Slack app se naya Copy karo")
        print("   (Scan results are still saved — continuing)")
        sys.exit(0)   # non-blocking: pipeline continues
    except urllib.error.URLError as e:
        # Network issue — internet down, DNS fail, timeout
        print(f"⚠️  Could not reach Slack: {e.reason}")
        print("   (Scan results are still saved — continuing)")
        sys.exit(0)
    except Exception as e:
        print(f"⚠️  Unexpected error sending Slack alert: {e}")
        sys.exit(0)