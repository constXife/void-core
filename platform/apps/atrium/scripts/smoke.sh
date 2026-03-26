#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"

echo "Smoke: /health"
curl -fsS "${BASE_URL}/health" >/dev/null

echo "Smoke: /api/workspace"
curl -fsS "${BASE_URL}/api/workspace" >/dev/null

echo "Smoke: /api/discovery"
curl -fsS -X POST "${BASE_URL}/api/discovery" \
  -H "Content-Type: application/json" \
  -d '{"key":"smoke-service","title":"Smoke Service","url":"http://localhost:8080"}' >/dev/null

echo "OK"
