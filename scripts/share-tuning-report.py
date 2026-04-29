#!/usr/bin/env python3
"""Summarize shared payloads captured by the Cloudflare event collector.

Input can be either:
  1. the JSON returned by GET /summary, or
  2. an array of sharedPayloads rows.

Output is a compact Markdown tuning report for adjusting receipt selection,
copy hooks, and future scoring weights without storing personal data.
"""
from __future__ import annotations

import argparse
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT = ROOT / "reports/share-tuning.md"


def load_payload(path: Path) -> list[dict[str, Any]]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(raw, dict):
        rows = raw.get("sharedPayloads", [])
    else:
        rows = raw
    if not isinstance(rows, list):
        raise SystemExit("Input must be a /summary JSON object or a sharedPayloads array")
    return [row for row in rows if isinstance(row, dict)]


def split_titles(value: Any) -> list[str]:
    if not isinstance(value, str):
        return []
    return [part.strip() for part in value.split("|") if part.strip()]


def lines_for_counter(title: str, counter: Counter[str], limit: int = 10) -> list[str]:
    lines = [f"## {title}", ""]
    if not counter:
        lines.append("No data yet.")
        lines.append("")
        return lines
    for key, count in counter.most_common(limit):
        lines.append(f"- {count} × {key}")
    lines.append("")
    return lines


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path, help="/summary JSON export or sharedPayloads JSON array")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()

    rows = load_payload(args.input)
    hook_counter = Counter(str(row.get("share_text") or row.get("shareText") or "").strip() for row in rows)
    hook_counter.pop("", None)
    method_counter = Counter(str(row.get("share_method") or row.get("shareMethod") or "unknown") for row in rows)
    campaign_counter = Counter(str(row.get("utm_campaign") or row.get("utmCampaign") or "none") for row in rows)
    title_counter: Counter[str] = Counter()
    for row in rows:
        title_counter.update(split_titles(row.get("share_item_titles") or row.get("shareItemTitles")))

    report = [
        "# Uncle Sam's Cart Share Tuning Report",
        "",
        f"Generated: {datetime.now(timezone.utc).isoformat()}",
        f"Rows analyzed: {len(rows)}",
        "",
        "Use this to tune the deterministic weirdness model: shared/copied item titles are positive signal; source clicks after share are stronger signal when joined with event logs.",
        "",
    ]
    report += lines_for_counter("Shared hooks", hook_counter)
    report += lines_for_counter("Shared item titles", title_counter, limit=20)
    report += lines_for_counter("Share method", method_counter)
    report += lines_for_counter("UTM campaign", campaign_counter)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text("\n".join(report), encoding="utf-8")
    print(json.dumps({"out": str(args.out), "rows": len(rows), "topItems": title_counter.most_common(5)}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
