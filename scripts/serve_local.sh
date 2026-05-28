#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-8080}"

echo "Serving investor briefing dashboard on http://${HOST}:${PORT}"
echo "On your phone, use your Mac's Wi-Fi IP address, for example: http://192.168.71.77:${PORT}"
python3 -m http.server "${PORT}" --bind "${HOST}"
