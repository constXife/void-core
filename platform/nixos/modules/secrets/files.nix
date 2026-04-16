{
  config,
  lib,
  ...
}: let
  types = import ../../lib/types.nix {inherit lib;};
  cfg = config.void.secrets.files;
in {
  options.void.secrets.files = {
    enable = lib.mkEnableOption "file-based runtime secrets baseline";

    runtimeDir = lib.mkOption {
      type = types.absoluteRuntimePath;
      default = "/run/secrets";
      example = "/run/secrets";
      description = "Directory used for runtime secret materialization.";
    };

    readerUsers = lib.mkOption {
      type = lib.types.listOf types.unixPrincipalName;
      default = [];
      description = "Users that should get read or execute access to the runtime secrets directory.";
    };

    readerGroups = lib.mkOption {
      type = lib.types.listOf types.unixPrincipalName;
      default = [];
      description = "Groups that should get read or execute access to the runtime secrets directory.";
    };
  };

  config = lib.mkIf cfg.enable {
    assertions = [
      {
        assertion = lib.hasPrefix "/" cfg.runtimeDir;
        message = "void.secrets.files.runtimeDir must be an absolute runtime path.";
      }
    ];

    systemd.tmpfiles.rules =
      [
        "d ${cfg.runtimeDir} 0750 root root -"
      ]
      ++ map (user: "a+ ${cfg.runtimeDir} - - - - u:${user}:rx") cfg.readerUsers
      ++ map (group: "a+ ${cfg.runtimeDir} - - - - g:${group}:rx") cfg.readerGroups;
  };
}
