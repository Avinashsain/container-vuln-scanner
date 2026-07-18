#!/usr/bin/env python3
"""Warns if any approved exception has passed its expiry date."""
import json
from datetime import date

with open("configs/exceptions.json") as f:
    exceptions = json.load(f)

today = date.today().isoformat()
expired = [e for e in exceptions if e["expires"] < today]

if expired:
    print("⚠️  EXPIRED exceptions — re-review needed:")
    for e in expired:
        print(f"   {e['cve']} (expired {e['expires']}, reason: {e['reason']})")
else:
    print("✅ All exceptions are still valid.")