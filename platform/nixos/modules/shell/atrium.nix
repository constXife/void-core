{
  config,
  lib,
  ...
}: let
  types = import ../../lib/types.nix {inherit lib;};
  cfg = config.services.atrium;
  etcPath = lib.removePrefix "/etc/" cfg.provisioningPath;
  loadEtcPath =
    if cfg.provisioningLoadPath == null
    then null
    else lib.removePrefix "/etc/" cfg.provisioningLoadPath;
in {
  # governance-rationale: Atrium currently exposes an upstream-style service
  # surface because this module is still a thin runtime integration shim.
  options.services.atrium = {
    enable = lib.mkEnableOption "Atrium portal";
    port = lib.mkOption {
      type = lib.types.port;
      default = 8080;
      example = 8080;
    };
    provisioningPath = lib.mkOption {
      type = types.absoluteRuntimePath;
      default = "/etc/atrium/provisioning.yaml";
      example = "/etc/atrium/provisioning.yaml";
      description = ''
        Runtime path for the Atrium compatibility provisioning input consumed by the
        current shell backend. This is not the canonical generated read artifact.
      '';
    };
    provisioningText = lib.mkOption {
      type = lib.types.lines;
      default = "";
    };
    provisioningFile = lib.mkOption {
      type = lib.types.nullOr lib.types.path;
      default = null;
      example = ./provisioning.yaml;
      description = "Optional source file for the Atrium compatibility provisioning input.";
    };
    provisioningLoadPath = lib.mkOption {
      type = lib.types.nullOr types.absoluteRuntimePath;
      default = null;
      example = "/etc/atrium/provisioning-load.yaml";
      description = ''
        Optional runtime path for the generated Atrium provisioning read artifact used
        by Rust-backed read surfaces.
      '';
    };
    provisioningLoadFile = lib.mkOption {
      type = lib.types.nullOr lib.types.path;
      default = null;
      example = ./provisioning-load.yaml;
      description = "Optional source file for the generated Atrium provisioning read artifact.";
    };
  };

  config = lib.mkIf cfg.enable {
    assertions = [
      {
        assertion = lib.hasPrefix "/etc/" cfg.provisioningPath;
        message = "services.atrium.provisioningPath must be under /etc";
      }
      {
        assertion = cfg.provisioningLoadPath == null || lib.hasPrefix "/etc/" cfg.provisioningLoadPath;
        message = "services.atrium.provisioningLoadPath must be under /etc when set";
      }
      {
        assertion = cfg.provisioningFile != null || cfg.provisioningText != "";
        message = "services.atrium requires provisioningFile or non-empty provisioningText when enabled.";
      }
      {
        assertion = cfg.provisioningLoadPath == null || cfg.provisioningLoadFile != null;
        message = "services.atrium.provisioningLoadPath requires provisioningLoadFile when enabled.";
      }
    ];
    environment.etc =
      {
        ${etcPath} =
          if cfg.provisioningFile != null
          then {source = cfg.provisioningFile;}
          else {text = cfg.provisioningText;};
      }
      // lib.optionalAttrs (cfg.provisioningLoadPath != null && cfg.provisioningLoadFile != null) {
        ${loadEtcPath}.source = cfg.provisioningLoadFile;
      };
  };
}
