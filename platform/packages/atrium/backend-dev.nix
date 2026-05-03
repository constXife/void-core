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

    auth_disabled="''${AUTH_DISABLED:-1}"
    auth_enable="false"
    case "$auth_disabled" in
      0|false|FALSE|False|no|NO|No)
        auth_enable="true"
        ;;
    esac

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
  runtime_config_path="$(mktemp "''${TMPDIR:-/tmp}/void-atrium-web-config.XXXXXX")"
    trap 'rm -f "$runtime_config_path"' EXIT INT TERM

    cat > "$runtime_config_path" <<EOF
  listen_address: "$listen_address"
  port: $listen_port
  base_url: ""
  atrium:
    client_root_path: "$client_root_path"
    widgets_path: "$widgets_path"
  auth:
    enable: $auth_enable
    mode: "token"
    token_file: ""
    token_env: "VOID_GRAPH_RUNTIME_MCP_TOKEN"
    header_name: "Authorization"
    atrium:
      user_overlay_path: ""
      required_scope: ""
  tls:
    enable: false
    cert_file: ""
    key_file: ""
  memgraph:
    runtime_config_path: ""
  knowledge_assets:
    enable: false
    registry:
      enable: false
      host: "127.0.0.1"
      port: 5432
      database: "knowledge_assets"
      username: "postgres"
      password_file: ""
      password_env: "POSTGRES_PASSWORD"
      sslmode: "disable"
    storage:
      default_backend: "garage"
      default_bucket: ""
      private_bucket: ""
      health_bucket: ""
      temp_exports_bucket: ""
      public_bucket: ""
      object_key_prefix: "knowledge-assets"
      s3_endpoint_url: ""
      s3_region: "garage"
      s3_force_path_style: true
      ca_bundle_file: ""
      access_key_id_file: ""
      secret_access_key_file: ""
      access_key_id_env: ""
      secret_access_key_env: ""
      upload_enable: false
  policy:
    allow_runtime_mutations: true
    allow_schema_drafts: true
    require_preview: true
    require_explain: true
    allowed_views: []
    allowed_namespaces: []
  EOF

    export VOID_ATRIUM_WEB_CONFIG="$runtime_config_path"
    export VOID_ATRIUM_WEB_LISTEN_ADDRESS="$listen_address"
    export VOID_ATRIUM_WEB_PORT="$listen_port"
    export VOID_ATRIUM_CLIENT_ROOT_PATH="$client_root_path"
    export VOID_ATRIUM_WIDGETS_PATH="$widgets_path"
    export FRONTEND_DEV_URL="''${FRONTEND_DEV_URL:-''${ATRIUM_FRONTEND_DEV_URL:-http://127.0.0.1:5173}}"
    export APP_ENV="''${APP_ENV:-dev}"
    export AUTH_COOKIE_SECRET="''${AUTH_COOKIE_SECRET:?AUTH_COOKIE_SECRET must be set in the environment or platform/apps/atrium/.env}"
    export AUTH_COOKIE_SECURE="''${AUTH_COOKIE_SECURE:-0}"

    exec ${run}/bin/atrium_run
''
