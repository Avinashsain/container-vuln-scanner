#!/usr/bin/env python3
"""
generate_report.py - Converts Trivy JSON into a clean HTML report.
Usage: python3 scripts/generate_report.py reports/scan.json reports/scan.html
"""
import json
import sys
from datetime import datetime

SEVERITY_COLORS = {
    "CRITICAL": "#d32f2f",  # red
    "HIGH":     "#f57c00",  # orange
    "MEDIUM":   "#fbc02d",  # yellow
    "LOW":      "#388e3c",  # green
    "UNKNOWN":  "#757575",  # grey
}

def generate_html(json_file, html_file):
    with open(json_file) as f:
        data = json.load(f)

    image_name = data.get("ArtifactName", "unknown")
    rows = []
    summary = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "UNKNOWN": 0}

    for result in data.get("Results", []):
        for v in result.get("Vulnerabilities", []) or []:
            sev = v.get("Severity", "UNKNOWN")
            summary[sev] = summary.get(sev, 0) + 1
            color = SEVERITY_COLORS.get(sev, "#757575")
            rows.append(f"""
            <tr>
                <td><a href="https://nvd.nist.gov/vuln/detail/{v.get('VulnerabilityID','')}"
                       target="_blank">{v.get('VulnerabilityID','')}</a></td>
                <td>{v.get('PkgName','')}</td>
                <td><span style="background:{color};color:white;
                     padding:3px 10px;border-radius:12px;font-size:12px">{sev}</span></td>
                <td>{v.get('InstalledVersion','')}</td>
                <td>{v.get('FixedVersion','No fix yet')}</td>
            </tr>""")

    # Sort summary badges for the top of the page
    badges = "".join(
        f'<div style="display:inline-block;margin:8px;padding:14px 22px;'
        f'background:{SEVERITY_COLORS[s]};color:white;border-radius:8px;text-align:center">'
        f'<div style="font-size:26px;font-weight:bold">{summary[s]}</div>'
        f'<div style="font-size:12px">{s}</div></div>'
        for s in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
    )

    html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Vulnerability Report - {image_name}</title>
<style>
  body {{ font-family: Arial, sans-serif; margin: 30px; background: #f5f5f5; }}
  .card {{ background: white; padding: 25px; border-radius: 10px;
           box-shadow: 0 2px 6px rgba(0,0,0,0.1); }}
  table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
  th {{ background: #263238; color: white; padding: 10px; text-align: left; }}
  td {{ padding: 8px 10px; border-bottom: 1px solid #eee; }}
  tr:hover {{ background: #f0f7ff; }}
</style>
</head>
<body>
<div class="card">
  <h1>🛡️ Container Vulnerability Report</h1>
  <p><b>Image:</b> {image_name}<br>
     <b>Scan date:</b> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}<br>
     <b>Total findings:</b> {sum(summary.values())}</p>
  {badges}
  <table>
    <tr><th>CVE ID</th><th>Package</th><th>Severity</th>
        <th>Installed Version</th><th>Fixed In</th></tr>
    {''.join(rows) if rows else '<tr><td colspan="5">🎉 No vulnerabilities found!</td></tr>'}
  </table>
</div>
</body>
</html>"""

    with open(html_file, "w") as f:
        f.write(html)
    print(f"✅ HTML report created: {html_file}")

if __name__ == "__main__":
    generate_html(sys.argv[1], sys.argv[2])