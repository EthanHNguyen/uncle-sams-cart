#!/usr/bin/env python3
"""Snapshot today's Uncle Sam's Cart receipt for habit-forming daily archives.

Outputs:
  public/data/archive/YYYY-MM-DD.json
  public/data/archive/index.json

The archive is compact and static-host friendly. It stores the exact receipt payload
that was visible on the homepage that day so shared links and future tuning can be
compared against historical receipts.
"""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "public/data/weird-items.json"
ARCHIVE_DIR = ROOT / "public/data/archive"
INDEX = ARCHIVE_DIR / "index.json"


def load_json(path: Path, default: Any = None) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def archive_date(payload: dict[str, Any]) -> str:
    generated = payload.get("generatedAt")
    if isinstance(generated, str) and generated:
        try:
            return datetime.fromisoformat(generated.replace("Z", "+00:00")).date().isoformat()
        except ValueError:
            pass
    return datetime.now(timezone.utc).date().isoformat()


def item_title(item: dict[str, Any]) -> str:
    return str(item.get("displayTitle") or item.get("title") or "Untitled")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", help="Override archive date as YYYY-MM-DD")
    args = parser.parse_args()

    payload = load_json(INPUT)
    if not isinstance(payload, dict):
        raise SystemExit(f"Missing or invalid {INPUT}")

    day = args.date or archive_date(payload)
    ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
    snapshot_path = ARCHIVE_DIR / f"{day}.json"

    snapshot = {
        **payload,
        "archiveDate": day,
        "archivedAt": datetime.now(timezone.utc).isoformat(),
    }
    snapshot_path.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    index = load_json(INDEX, {"source": "uncle-sams-cart-archive", "receipts": []})
    receipts = [r for r in index.get("receipts", []) if r.get("date") != day]
    items = snapshot.get("items", []) if isinstance(snapshot.get("items"), list) else []
    receipts.append({
        "date": day,
        "path": f"/data/archive/{day}.json",
        "generatedAt": snapshot.get("generatedAt"),
        "activeRows": snapshot.get("activeRows"),
        "itemCount": len(items),
        "titles": [item_title(item) for item in items],
    })
    receipts.sort(key=lambda r: r.get("date", ""), reverse=True)
    index = {
        "source": "uncle-sams-cart-archive",
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "latestDate": receipts[0]["date"] if receipts else day,
        "receipts": receipts[:90],
    }
    INDEX.write_text(json.dumps(index, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(json.dumps({"snapshot": str(snapshot_path.relative_to(ROOT)), "index": str(INDEX.relative_to(ROOT)), "date": day, "itemCount": len(items)}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
