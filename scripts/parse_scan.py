#!/usr/bin/env python3
"""
parse_scan.py - Reads a Trivy JSON report and prints a severity summary.
Usage: python3 scripts/parse_scan.py reports/python34-scan.json
"""
import json
import sys

def parse_report(json_file):
    # Step 1: Load the JSON file created by Trivy
    with open(json_file, "r") as f:
        data = json.load(f)

    # Step 2: Prepare counters for each severity level
    summary = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "UNKNOWN": 0}
    vulnerabilities = []

    # Step 3: Trivy groups results by "target" (e.g., OS packages, pip packages)
    for result in data.get("Results", []):
        for vuln in result.get("Vulnerabilities", []) or []:
            severity = vuln.get("Severity", "UNKNOWN")
            summary[severity] = summary.get(severity, 0) + 1
            vulnerabilities.append({
                "id": vuln.get("VulnerabilityID"),
                "package": vuln.get("PkgName"),
                "severity": severity,
                "installed": vuln.get("InstalledVersion"),
                "fixed": vuln.get("FixedVersion", "No fix yet"),
                "title": vuln.get("Title", "")[:60],
            })

    # Step 4: Print a clean summary
    print(f"\n{'='*50}")
    print(f"  SCAN SUMMARY: {data.get('ArtifactName', 'unknown image')}")
    print(f"{'='*50}")
    for sev, count in summary.items():
        print(f"  {sev:<10} : {count}")
    print(f"  {'TOTAL':<10} : {sum(summary.values())}")

    return summary, vulnerabilities

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 parse_scan.py <trivy-json-report>")
        sys.exit(1)
    parse_report(sys.argv[1])