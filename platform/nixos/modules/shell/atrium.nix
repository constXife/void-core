{
  config,
  lib,
  pkgs,
  ...
}: let
  types = import ../../lib/types.nix {inherit lib;};
  cfg = config.services.atrium;
  defaultPackage = (import ../../../packages/atrium {inherit pkgs;}).server;
  clientRootEtcPath = lib.removePrefix "/etc/" cfg.clientRootPath;
  widgetsEtcPath = lib.removePrefix "/etc/" cfg.widgetsPath;
  runtimeConfigEtcPath = lib.removePrefix "/etc/" cfg.runtimeConfigPath;
  runtimeConfigText = ''
    listen_address: "${cfg.listenAddress}"
    port: ${toString cfg.port}
    base_url: ""
    atrium:
      client_root_path: "${cfg.clientRootPath}"
      widgets_path: "${cfg.widgetsPath}"
    auth:
      enable: false
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
  '';
in {
  # governance-rationale: Atrium is exposed as a service module because it is the
  # operator-facing shell entrypoint; product-specific composition remains outside
  # the foundation module.
  options.services.atrium = {
    enable = lib.mkEnableOption "Atrium portal";
    package = lib.mkOption {
      type = lib.types.nullOr lib.types.package;
      default = defaultPackage;
      description = ''
        Runnable Atrium host package. By default this is the standalone `void-core`
        preview server wrapper backed by `atrium-host-rust`.
      '';
    };
    hostMode = lib.mkOption {
      type = lib.types.enum ["preview" "shim"];
      default = "preview";
      description = ''
        Host runtime mode for the packaged Atrium server. `preview` runs the standalone
        `void-core` foundation host. `shim` delegates to a downstream host binary when
        the wrapped package supports it.
      '';
    };
    listenAddress = lib.mkOption {
      # governance-open-contract: bind addresses may be IPv4, IPv6, localhost, or wildcard forms.
      type = lib.types.str;
      default = "127.0.0.1";
      example = "0.0.0.0";
    };
    port = lib.mkOption {
      type = lib.types.port;
      default = 8080;
      example = 8080;
    };
    runtimeConfigPath = lib.mkOption {
      type = types.absoluteRuntimePath;
      default = "/etc/atrium/runtime-config.yaml";
      example = "/etc/atrium/runtime-config.yaml";
    };
    clientRootPath = lib.mkOption {
      type = types.absoluteRuntimePath;
      default = "/etc/atrium/client-root";
      example = "/etc/atrium/client-root";
      description = ''
        Runtime path for the canonical Atrium client root directory consumed by the
        Rust web host and graph runtime.
      '';
    };
    clientRootSource = lib.mkOption {
      type = lib.types.nullOr lib.types.path;
      default = ../../../apps/atrium/client-root/default;
      example = ./client-root;
      description = "Optional source directory for the canonical Atrium client root.";
    };
    widgetsPath = lib.mkOption {
      type = types.absoluteRuntimePath;
      default = "/etc/atrium/widgets.yaml";
      example = "/etc/atrium/widgets.yaml";
      description = ''
        Runtime path for the canonical Atrium widgets payload consumed by the
        Rust web host and graph runtime.
      '';
    };
    widgetsText = lib.mkOption {
      type = lib.types.lines;
      default = "";
    };
    widgetsFile = lib.mkOption {
      type = lib.types.nullOr lib.types.path;
      default = ../../../apps/atrium/widgets/default.yaml;
      example = ./widgets.yaml;
      description = "Optional source file for the canonical Atrium widgets payload.";
    };
  };

  config = lib.mkIf cfg.enable {
    assertions = [
      {
        assertion = lib.hasPrefix "/etc/" cfg.clientRootPath;
        message = "services.atrium.clientRootPath must be under /etc";
      }
      {
        assertion = lib.hasPrefix "/etc/" cfg.widgetsPath;
        message = "services.atrium.widgetsPath must be under /etc";
      }
      {
        assertion = lib.hasPrefix "/etc/" cfg.runtimeConfigPath;
        message = "services.atrium.runtimeConfigPath must be under /etc";
      }
    ];
    environment.etc = {
      ${clientRootEtcPath}.source = cfg.clientRootSource;
      ${runtimeConfigEtcPath}.text = runtimeConfigText;
      ${widgetsEtcPath} =
        if cfg.widgetsFile != null
        then {source = cfg.widgetsFile;}
        else {text = cfg.widgetsText;};
    };
    systemd.services.atrium = lib.mkIf (cfg.package != null) {
      description = lib.mkDefault "Atrium foundation shell";
      wantedBy = lib.mkDefault ["multi-user.target"];
      after = lib.mkDefault ["network-online.target"];
      wants = lib.mkDefault ["network-online.target"];
      serviceConfig = {
        Type = lib.mkDefault "simple";
        ExecStart = lib.mkDefault "${cfg.package}/bin/atrium";
        Restart = lib.mkDefault "on-failure";
        DynamicUser = lib.mkDefault true;
        StateDirectory = lib.mkDefault "atrium";
      };
      environment = {
        VOID_ATRIUM_WEB_CONFIG = lib.mkDefault cfg.runtimeConfigPath;
        VOID_ATRIUM_WEB_LISTEN_ADDRESS = lib.mkDefault cfg.listenAddress;
        VOID_ATRIUM_WEB_PORT = lib.mkDefault (toString cfg.port);
        VOID_ATRIUM_CLIENT_ROOT_PATH = lib.mkDefault cfg.clientRootPath;
        VOID_ATRIUM_WIDGETS_PATH = lib.mkDefault cfg.widgetsPath;
        ATRIUM_HOST_MODE = lib.mkDefault cfg.hostMode;
      };
      path = lib.mkDefault [pkgs.coreutils];
    };
  };
}
