{
  pkgs,
  hostRust,
}:
pkgs.writeShellScriptBin "atrium_run" ''
  set -euo pipefail

  host_mode="''${ATRIUM_HOST_MODE:-}"
  if [ -z "$host_mode" ]; then
    host_mode="preview"
  fi

  case "$host_mode" in
    preview|shim)
      ;;
    *)
      echo "Unsupported ATRIUM_HOST_MODE=$host_mode; expected preview or shim." >&2
      exit 2
      ;;
  esac

  export ATRIUM_HOST_MODE="$host_mode"

  exec ${hostRust}/bin/atrium-host-rust
''
