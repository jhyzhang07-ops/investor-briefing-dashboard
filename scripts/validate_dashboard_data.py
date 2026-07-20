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


def has_bilingual_markers(value: Any) -> bool:
    if not isinstance(value, str):
        return False
    return "EN:" in value and ("中文" in value or "Chinese:" in value)


def iter_watch_items(entry: dict[str, Any]) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for key in ["stocks", "smallCaps", "etfs"]:
        value = entry.get(key)
        if isinstance(value, list):
            items.extend(item for item in value if isinstance(item, dict))
    return items


def validate_practical_watch_items(prefix: str, entry: dict[str, Any], errors: list[str]) -> None:
    for item in iter_watch_items(entry):
        ticker = item.get("ticker", "unknown ticker")
        why = item.get("why", "")
        require(
            "Fundamental" in why or "基本面" in why,
            f"{prefix} {ticker} why field missing fundamental/basic-metrics discussion",
            errors,
        )
        require(
            "Technical" in why or "技术面" in why,
            f"{prefix} {ticker} why field missing technical discussion",
            errors,
        )
        require(
            "Volume" in why or "成交量" in why or "流动性" in why,
            f"{prefix} {ticker} why field missing volume/liquidity discussion",
            errors,
        )


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
        value = entry.get(key)
        require(is_non_empty_text(value), f"U.S. latest entry missing text field: {key}", errors)
        require(has_bilingual_markers(value), f"U.S. latest entry {key} must be bilingual EN/中文", errors)

    for key in ["priorities", "summary", "forecast"]:
        items = entry.get(key)
        if isinstance(items, list):
            for index, item in enumerate(items, start=1):
                require(is_non_empty_text(item), f"U.S. latest entry {key}[{index}] missing text", errors)
                require(has_bilingual_markers(item), f"U.S. latest entry {key}[{index}] must be bilingual EN/中文", errors)

    validate_practical_watch_items("U.S. latest entry", entry, errors)


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
        require(has_bilingual_markers(value), f"A-share latest entry {key} must be bilingual 中文/EN", errors)

    sections = entry.get("sections")
    has_pre_catalyst = False
    if isinstance(sections, list):
        for section in sections:
            if not isinstance(section, dict):
                continue
            title = section.get("title", "")
            if isinstance(title, str) and ("Pre-Catalyst Watchlist" in title or "提前催化预警" in title):
                has_pre_catalyst = is_non_empty_list(section.get("items"))
                break
    require(
        has_pre_catalyst,
        "A-share latest entry missing non-empty 提前催化预警 / Pre-Catalyst Watchlist section",
        errors,
    )

    for item in iter_watch_items(entry):
        ticker = item.get("ticker", "unknown ticker")
        require(is_non_empty_text(item.get("chineseName")), f"A-share latest entry {ticker} missing chineseName", errors)

    validate_practical_watch_items("A-share latest entry", entry, errors)


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
