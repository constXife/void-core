#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
atrium_app_dir="$(cd "$script_dir/.." && pwd)"
void_core_repo_root="$(cd "$atrium_app_dir/../../.." && pwd)"
port="${ATRIUM_SELF_CONTAINED_SMOKE_PORT:-18187}"
log_file="${TMPDIR:-/tmp}/void-core-atrium-self-contained-smoke.log"

rm -f "$log_file"

cleanup() {
  if [ -n "${atrium_pid:-}" ]; then
    kill "$atrium_pid" 2>/dev/null || true
    wait "$atrium_pid" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

env \
  -u ATRIUM_HOST_MODE \
  VOID_REPO_ROOT=/definitely/not/void \
  VOID_CORE_REPO_ROOT="$void_core_repo_root" \
  VOID_CORE_ATRIUM_APP_DIR="$atrium_app_dir" \
  VOID_ATRIUM_WEB_LISTEN_ADDRESS=127.0.0.1 \
  VOID_ATRIUM_WEB_PORT="$port" \
  nix run "$void_core_repo_root#atrium-backend-dev" >"$log_file" 2>&1 &
atrium_pid=$!

for _ in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:$port/health" >/dev/null; then
    curl -fsS "http://127.0.0.1:$port/atrium/workspace" >/dev/null
    curl -fsS "http://127.0.0.1:$port/atrium/widgets" >/dev/null
    echo "OK"
    exit 0
  fi
  if ! kill -0 "$atrium_pid" 2>/dev/null; then
    cat "$log_file" >&2
    exit 1
  fi
  sleep 0.25
done

cat "$log_file" >&2
echo "Atrium self-contained smoke timed out on port $port" >&2
exit 1
