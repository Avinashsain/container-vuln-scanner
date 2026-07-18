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
    with urllib.request.urlopen(req) as resp:
        print(f"✅ Slack notified (HTTP {resp.status})")

if __name__ == "__main__":
    webhook = os.environ.get("SLACK_WEBHOOK_URL")
    if not webhook:
        print("❌ Set SLACK_WEBHOOK_URL environment variable first")
        sys.exit(1)
    image, summary = build_summary(sys.argv[1])
    send_to_slack(webhook, image, summary)