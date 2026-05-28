#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ -f ".publish-dashboard.lock" ]]; then
  exit 0
fi

touch ".publish-dashboard.lock"
trap 'rm -f ".publish-dashboard.lock"' EXIT

bash scripts/publish_dashboard.sh
