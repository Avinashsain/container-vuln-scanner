#!/usr/bin/env python3
"""
push_metrics.py - Sends vulnerability counts to Pushgateway.
Usage: python3 scripts/push_metrics.py reports/scan.json
"""
import json
import sys
import urllib.request
from pathlib import Path

PUSHGATEWAY = "http://localhost:9091"
REPO_ROOT = Path(__file__).resolve().parent.parent


def resolve_report_path(json_file):
    path = Path(json_file)
    if path.is_absolute() and path.exists():
        return path

    candidate = path if path.exists() else REPO_ROOT / path
    if candidate.exists():
        return candidate

    raise FileNotFoundError(f"Report file not found: {json_file}")


def push(json_file):
    resolved_path = resolve_report_path(json_file)
    with open(resolved_path) as f:
        data = json.load(f)

    image = data.get("ArtifactName", "unknown")
    summary = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for result in data.get("Results", []):
        for v in result.get("Vulnerabilities", []) or []:
            sev = v.get("Severity")
            if sev in summary:
                summary[sev] += 1

    # Prometheus text format: metric_name{label="value"} number
    lines = []
    for sev, count in summary.items():
        lines.append(
            f'container_vulnerabilities{{severity="{sev.lower()}"}} {count}'
        )
    payload = "\n".join(lines) + "\n"

    # Image name goes in the URL path as a grouping label.
    # Replace / and : because they are not allowed in the URL path.
    safe_image = image.replace("/", "_").replace(":", "_")
    url = f"{PUSHGATEWAY}/metrics/job/vuln_scanner/image/{safe_image}"

    req = urllib.request.Request(url, data=payload.encode(), method="POST")
    with urllib.request.urlopen(req) as resp:
        print(f"✅ Metrics pushed for {image} (HTTP {resp.status})")

if __name__ == "__main__":
    push(sys.argv[1])