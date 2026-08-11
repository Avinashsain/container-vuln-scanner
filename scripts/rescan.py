#!/usr/bin/env python3
"""
rescan.py - Rescans images and alerts only if counts changed since last scan.
Keeps previous results in reports/last_state.json
"""
import json
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
STATE_FILE = REPO_ROOT / "reports" / "last_state.json"
IMAGES = ["nginx:latest", "blue-green-deployment-backend:latest"]


def scan(image):
    """Run trivy and return severity counts."""
    result = subprocess.run(
        ["trivy", "image", "--format", "json", "--quiet", image],
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        stderr = (result.stderr or result.stdout or "").strip()
        print(f"⚠️  Skipping {image}: trivy failed ({stderr or 'unknown error'})")
        return None

    try:
        data = json.loads(result.stdout or "{}")
    except json.JSONDecodeError as exc:
        print(f"⚠️  Skipping {image}: invalid JSON from trivy ({exc})")
        return None

    counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for r in data.get("Results", []):
        for v in r.get("Vulnerabilities", []) or []:
            severity = v.get("Severity")
            if severity in counts:
                counts[severity] += 1
    return counts


def main():
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)

    # Load previous state (empty dict on first run)
    old_state = {}
    if STATE_FILE.exists():
        with open(STATE_FILE) as f:
            old_state = json.load(f)

    new_state = {}
    for img in IMAGES:
        print(f"🔍 Rescanning {img} ...")
        counts = scan(img)
        if counts is None:
            continue

        new_state[img] = counts
        old = old_state.get(img)

        if old and old != new_state[img]:
            print(f"🚨 CHANGE DETECTED for {img}:")
            print(f"   before: {old}")
            print(f"   after : {new_state[img]}")
            # → here you could call slack_notify to alert the team
        else:
            print(f"   no change ({new_state[img]})")

    with open(STATE_FILE, "w") as f:
        json.dump(new_state, f, indent=2)


if __name__ == "__main__":
    main()