#!/usr/bin/env python3
"""
rescan.py - Rescans images and alerts only if counts changed since last scan.
Keeps previous results in reports/last_state.json
"""
import json
import os
import subprocess

STATE_FILE = "reports/last_state.json"
IMAGES = ["myapp:latest", "nginx:latest"]

def scan(image):
    """Run trivy and return severity counts."""
    result = subprocess.run(
        ["trivy", "image", "--format", "json", "--quiet", image],
        capture_output=True, text=True
    )
    data = json.loads(result.stdout)
    counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for r in data.get("Results", []):
        for v in r.get("Vulnerabilities", []) or []:
            if v.get("Severity") in counts:
                counts[v["Severity"]] += 1
    return counts

def main():
    # Load previous state (empty dict on first run)
    old_state = {}
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE) as f:
            old_state = json.load(f)

    new_state = {}
    for img in IMAGES:
        print(f"🔍 Rescanning {img} ...")
        new_state[img] = scan(img)
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