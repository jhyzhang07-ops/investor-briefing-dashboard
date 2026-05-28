#!/usr/bin/env bash
set -euo pipefail

plist_path="${HOME}/Library/LaunchAgents/com.jerry.investor-briefing-dashboard.publisher.plist"

launchctl unload "${plist_path}" >/dev/null 2>&1 || true
rm -f "${plist_path}"

echo "Auto-publisher uninstalled."
