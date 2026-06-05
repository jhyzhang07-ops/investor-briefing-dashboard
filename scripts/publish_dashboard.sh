#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

scope="${PUBLISH_SCOPE:-all}"

python3 scripts/validate_dashboard_data.py --scope "$scope"

files=(
  index.html
  styles.css
  app.js
  README.md
  .nojekyll
  assets/market-hero.png
  scripts/archive_briefing.py
  scripts/validate_dashboard_data.py
  scripts/serve_local.sh
  scripts/publish_dashboard.sh
  scripts/auto_publish_once.sh
  scripts/install_auto_publish.sh
  scripts/uninstall_auto_publish.sh
)

case "$scope" in
  all)
    files+=(
      data/briefings-data.js
      data/a-share-briefings-data.js
      data/weekly-briefings-data.js
      data/a-share-weekly-briefings-data.js
    )
    ;;
  us)
    files+=(
      data/briefings-data.js
      data/weekly-briefings-data.js
    )
    ;;
  a-share)
    files+=(
      data/a-share-briefings-data.js
      data/a-share-weekly-briefings-data.js
    )
    ;;
  *)
    echo "Unknown PUBLISH_SCOPE: $scope" >&2
    exit 1
    ;;
esac

git add "${files[@]}"

if git diff --cached --quiet; then
  echo "No dashboard changes to publish."
  exit 0
fi

today="$(TZ=Asia/Shanghai date +%Y-%m-%d)"
git commit -m "Update investor briefing dashboard ${today}"
git push origin main
