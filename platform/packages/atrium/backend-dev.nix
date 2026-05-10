{
  pkgs,
  run,
}:
pkgs.writeShellScriptBin "atrium_backend_dev" ''
  set -euo pipefail

  void_core_repo_root="''${VOID_CORE_REPO_ROOT:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
  atrium_app_dir="''${VOID_CORE_ATRIUM_APP_DIR:-$void_core_repo_root/platform/apps/atrium}"

  env_file="$atrium_app_dir/.env"
  if [ ! -f "$env_file" ] && [ -f "$atrium_app_dir/.env.example" ]; then
    env_file="$atrium_app_dir/.env.example"
  fi

  cd "$atrium_app_dir"

  set -a
  if [ -f "$env_file" ]; then
    . "$env_file"
  fi
  set +a

  if [ -z "''${ATRIUM_HOST_MODE:-}" ]; then
    export ATRIUM_HOST_MODE="preview"
  fi

  listen_address="''${VOID_ATRIUM_WEB_LISTEN_ADDRESS:-127.0.0.1}"
  listen_port="''${VOID_ATRIUM_WEB_PORT:-8080}"
  if [ -n "''${ATRIUM_LISTEN_ADDR:-}" ]; then
    case "$ATRIUM_LISTEN_ADDR" in
      :*)
        listen_port="''${ATRIUM_LISTEN_ADDR#:}"
        ;;
      *:*)
        listen_address="''${ATRIUM_LISTEN_ADDR%:*}"
        listen_port="''${ATRIUM_LISTEN_ADDR##*:}"
        ;;
    esac
  fi

  client_root_path="''${VOID_ATRIUM_CLIENT_ROOT_PATH:-''${ATRIUM_CLIENT_ROOT_PATH:-$atrium_app_dir/client-root/default}}"
  widgets_path="''${VOID_ATRIUM_WIDGETS_PATH:-''${ATRIUM_WIDGETS_PATH:-$atrium_app_dir/widgets/default.yaml}}"

  export VOID_ATRIUM_WEB_LISTEN_ADDRESS="$listen_address"
  export VOID_ATRIUM_WEB_PORT="$listen_port"
  export VOID_ATRIUM_CLIENT_ROOT_PATH="$client_root_path"
  export VOID_ATRIUM_WIDGETS_PATH="$widgets_path"

  exec ${run}/bin/atrium_run
''
