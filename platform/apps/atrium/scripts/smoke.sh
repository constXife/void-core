#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"

echo "Smoke: /health"
curl -fsS "${BASE_URL}/health" >/dev/null

echo "Smoke: /atrium/workspace"
curl -fsS "${BASE_URL}/atrium/workspace" >/dev/null

echo "Smoke: /atrium/widgets"
curl -fsS "${BASE_URL}/atrium/widgets" >/dev/null

echo "OK"
