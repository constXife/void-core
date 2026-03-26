{
  config,
  lib,
  ...
}: let
  types = import ../../lib/types.nix {inherit lib;};
  cfg = config.services.atrium;
  etcPath = lib.removePrefix "/etc/" cfg.provisioningPath;
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
    };
    provisioningText = lib.mkOption {
      type = lib.types.lines;
      default = "";
    };
    provisioningFile = lib.mkOption {
      type = lib.types.nullOr lib.types.path;
      default = null;
      example = ./provisioning.yaml;
    };
  };

  config = lib.mkIf cfg.enable {
    assertions = [
      {
        assertion = lib.hasPrefix "/etc/" cfg.provisioningPath;
        message = "services.atrium.provisioningPath must be under /etc";
      }
      {
        assertion = cfg.provisioningFile != null || cfg.provisioningText != "";
        message = "services.atrium requires provisioningFile or non-empty provisioningText when enabled.";
      }
    ];
    environment.etc.${etcPath} =
      if cfg.provisioningFile != null
      then {source = cfg.provisioningFile;}
      else {text = cfg.provisioningText;};
  };
}
