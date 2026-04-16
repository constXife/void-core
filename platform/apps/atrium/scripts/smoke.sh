#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"

echo "Smoke: /health"
curl -fsS "${BASE_URL}/health" >/dev/null

echo "Smoke: /api/v1/workspace"
curl -fsS "${BASE_URL}/api/v1/workspace" >/dev/null

echo "Smoke: /api/widgets"
curl -fsS "${BASE_URL}/api/widgets" >/dev/null

echo "OK"
