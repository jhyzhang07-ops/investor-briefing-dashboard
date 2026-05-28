#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")/.." && pwd)"
plist_dir="${HOME}/Library/LaunchAgents"
plist_path="${plist_dir}/com.jerry.investor-briefing-dashboard.publisher.plist"
log_dir="${HOME}/Library/Logs"

mkdir -p "${plist_dir}" "${log_dir}"

cat > "${plist_path}" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.jerry.investor-briefing-dashboard.publisher</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>${project_dir}/scripts/auto_publish_once.sh</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${project_dir}</string>
  <key>WatchPaths</key>
  <array>
    <string>${project_dir}/index.html</string>
    <string>${project_dir}/styles.css</string>
    <string>${project_dir}/app.js</string>
    <string>${project_dir}/README.md</string>
    <string>${project_dir}/data/briefings-data.js</string>
    <string>${project_dir}/data/a-share-briefings-data.js</string>
    <string>${project_dir}/assets/market-hero.png</string>
    <string>${project_dir}/scripts/archive_briefing.py</string>
    <string>${project_dir}/scripts/publish_dashboard.sh</string>
  </array>
  <key>StandardOutPath</key>
  <string>${log_dir}/investor-briefing-dashboard-publisher.log</string>
  <key>StandardErrorPath</key>
  <string>${log_dir}/investor-briefing-dashboard-publisher.err.log</string>
</dict>
</plist>
PLIST

launchctl unload "${plist_path}" >/dev/null 2>&1 || true
launchctl load "${plist_path}"

echo "Auto-publisher installed."
echo "It will publish dashboard changes to GitHub when watched files change."
echo "Logs:"
echo "  ${log_dir}/investor-briefing-dashboard-publisher.log"
echo "  ${log_dir}/investor-briefing-dashboard-publisher.err.log"
