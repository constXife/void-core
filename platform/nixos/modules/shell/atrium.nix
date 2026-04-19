{
  config,
  lib,
  ...
}: let
  types = import ../../lib/types.nix {inherit lib;};
  cfg = config.services.atrium;
  clientRootEtcPath = lib.removePrefix "/etc/" cfg.clientRootPath;
  widgetsEtcPath = lib.removePrefix "/etc/" cfg.widgetsPath;
in {
  options.services.atrium = {
    enable = lib.mkEnableOption "Atrium portal";
    port = lib.mkOption {
      type = lib.types.port;
      default = 8080;
      example = 8080;
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
      default = null;
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
      default = null;
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
        assertion = cfg.clientRootSource != null;
        message = "services.atrium.clientRootSource is required when enabled.";
      }
      {
        assertion = cfg.widgetsFile != null || cfg.widgetsText != "";
        message = "services.atrium requires widgetsFile or non-empty widgetsText when enabled.";
      }
    ];
    environment.etc =
      {
        ${clientRootEtcPath}.source = cfg.clientRootSource;
        ${widgetsEtcPath} =
          if cfg.widgetsFile != null
          then {source = cfg.widgetsFile;}
          else {text = cfg.widgetsText;};
      }
      ;
  };
}
