{
  config,
  lib,
  ...
}: let
  cfg = config.void.secrets.files;
in {
  options.void.secrets.files = {
    enable = lib.mkEnableOption "file-based runtime secrets baseline";

    runtimeDir = lib.mkOption {
      type = lib.types.str;
      default = "/run/secrets";
      description = "Directory used for runtime secret materialization.";
    };

    readerUsers = lib.mkOption {
      type = lib.types.listOf lib.types.str;
      default = [];
      description = "Users that should get read or execute access to the runtime secrets directory.";
    };

    readerGroups = lib.mkOption {
      type = lib.types.listOf lib.types.str;
      default = [];
      description = "Groups that should get read or execute access to the runtime secrets directory.";
    };
  };

  config = lib.mkIf cfg.enable {
    systemd.tmpfiles.rules =
      [
        "d ${cfg.runtimeDir} 0750 root root -"
      ]
      ++ map (user: "a+ ${cfg.runtimeDir} - - - - u:${user}:rx") cfg.readerUsers
      ++ map (group: "a+ ${cfg.runtimeDir} - - - - g:${group}:rx") cfg.readerGroups;
  };
}
