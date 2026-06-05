#!/usr/bin/env python3
"""Validate the latest dashboard briefing entries before publish."""

from __future__ import annotations

import json
import re
import sys
import argparse
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--scope",
        choices=["all", "us", "a-share"],
        default="all",
        help="Validate all dashboard data files or only one market.",
    )
    return parser.parse_args()


def load_window_array(path: Path, window_var: str) -> list[dict[str, Any]]:
    text = path.read_text(encoding="utf-8").strip()
    match = re.fullmatch(rf"window\.{re.escape(window_var)}\s*=\s*(\[.*\]);?", text, re.S)
    if not match:
        raise ValueError(f"{path} does not match window.{window_var} = [ ... ];")

    data = json.loads(match.group(1))
    if not isinstance(data, list) or not data:
        raise ValueError(f"{path} must contain a non-empty array")
    return data


def require(condition: bool, message: str, errors: list[str]) -> None:
    if not condition:
        errors.append(message)


def is_non_empty_list(value: Any) -> bool:
    return isinstance(value, list) and len(value) > 0


def is_non_empty_text(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def validate_us_latest(entry: dict[str, Any], errors: list[str]) -> None:
    required_lists = [
        "priorities",
        "summary",
        "forecast",
        "sectors",
        "stocks",
        "smallCaps",
        "etfs",
        "sections",
        "sources",
        "catalystCalendar",
        "performanceTracker",
    ]
    for key in required_lists:
        require(is_non_empty_list(entry.get(key)), f"U.S. latest entry missing non-empty list: {key}", errors)

    require(isinstance(entry.get("marketPulse"), dict) and entry["marketPulse"], "U.S. latest entry missing marketPulse", errors)
    require(isinstance(entry.get("actionBoard"), dict) and entry["actionBoard"], "U.S. latest entry missing actionBoard", errors)

    for key in ["title", "tone"]:
        require(is_non_empty_text(entry.get(key)), f"U.S. latest entry missing text field: {key}", errors)

    for key in ["priorities", "summary", "forecast"]:
        items = entry.get(key)
        if isinstance(items, list):
            for index, item in enumerate(items, start=1):
                require(is_non_empty_text(item), f"U.S. latest entry {key}[{index}] missing text", errors)


def validate_a_share_latest(entry: dict[str, Any], errors: list[str]) -> None:
    required_lists = [
        "priorities",
        "summary",
        "forecast",
        "sectors",
        "stocks",
        "smallCaps",
        "etfs",
        "sections",
        "sources",
        "catalystCalendar",
        "performanceTracker",
    ]
    for key in required_lists:
        require(is_non_empty_list(entry.get(key)), f"A-share latest entry missing non-empty list: {key}", errors)

    require(isinstance(entry.get("marketPulse"), dict) and entry["marketPulse"], "A-share latest entry missing marketPulse", errors)
    require(isinstance(entry.get("actionBoard"), dict) and entry["actionBoard"], "A-share latest entry missing actionBoard", errors)

    for key in ["title", "tone"]:
        value = entry.get(key)
        require(isinstance(value, str) and value.strip(), f"A-share latest entry missing text field: {key}", errors)
        require("EN:" not in value, f"A-share latest entry should not contain English marker in {key}", errors)


def main() -> int:
    args = parse_args()
    errors: list[str] = []

    us_path = ROOT / "data" / "briefings-data.js"
    a_path = ROOT / "data" / "a-share-briefings-data.js"

    if args.scope in {"all", "us"}:
        us_latest = load_window_array(us_path, "MARKET_BRIEFINGS")[0]
        validate_us_latest(us_latest, errors)

    if args.scope in {"all", "a-share"}:
        a_latest = load_window_array(a_path, "A_SHARE_BRIEFINGS")[0]
        validate_a_share_latest(a_latest, errors)

    if errors:
        print("Dashboard validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print("Dashboard validation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
