#!/usr/bin/env python3
"""Append or replace a daily investor briefing in the dashboard data file."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / "data" / "briefings-data.js"
WINDOW_VAR = "MARKET_BRIEFINGS"
SUFFIX = ";"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input",
        type=Path,
        help="JSON file containing one briefing object. Reads stdin when omitted.",
    )
    parser.add_argument(
        "--data-file",
        type=Path,
        default=DATA_FILE,
        help="Dashboard data file to update.",
    )
    parser.add_argument(
        "--window-var",
        default=WINDOW_VAR,
        help="Window variable name used by the dashboard data file.",
    )
    return parser.parse_args()


def load_existing(path: Path, window_var: str) -> list[dict[str, Any]]:
    if not path.exists():
        return []

    text = path.read_text(encoding="utf-8").strip()
    if not text:
        return []

    match = re.fullmatch(rf"window\.{re.escape(window_var)}\s*=\s*(\[.*\]);?", text, re.S)
    if not match:
        raise ValueError(f"{path} does not use the expected window.{window_var} shape")

    data = json.loads(match.group(1))
    if not isinstance(data, list):
        raise ValueError("MARKET_BRIEFINGS must be an array")
    return data


def load_briefing(path: Path | None) -> dict[str, Any]:
    raw = path.read_text(encoding="utf-8") if path else sys.stdin.read()
    briefing = json.loads(raw)
    if not isinstance(briefing, dict):
        raise ValueError("Briefing input must be a JSON object")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(briefing.get("date", ""))):
        raise ValueError("Briefing must include date in YYYY-MM-DD format")
    if not briefing.get("title"):
        raise ValueError("Briefing must include a title")
    return briefing


def write_data(path: Path, window_var: str, briefings: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    briefings = sorted(briefings, key=lambda item: item["date"], reverse=True)
    payload = json.dumps(briefings, ensure_ascii=False, indent=2)
    path.write_text(f"window.{window_var} = {payload}{SUFFIX}\n", encoding="utf-8")


def main() -> int:
    args = parse_args()
    data_file = args.data_file.resolve()
    window_var = args.window_var
    if not re.fullmatch(r"[A-Za-z_$][A-Za-z0-9_$]*", window_var):
        raise ValueError("--window-var must be a valid JavaScript identifier")
    briefing = load_briefing(args.input)
    existing = load_existing(data_file, window_var)

    by_date = {item.get("date"): item for item in existing if isinstance(item, dict)}
    action = "replaced" if briefing["date"] in by_date else "added"
    by_date[briefing["date"]] = briefing

    write_data(data_file, window_var, list(by_date.values()))
    print(f"{action} briefing for {briefing['date']} in {data_file}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
