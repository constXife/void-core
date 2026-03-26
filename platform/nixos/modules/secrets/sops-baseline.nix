{
  config,
  lib,
  ...
}: let
  types = import ../../lib/types.nix {inherit lib;};
  cfg = config.void.secrets.sops;
in {
  options.void.secrets.sops = {
    enable = lib.mkEnableOption "sops-nix bootstrap baseline";

    defaultSopsFile = lib.mkOption {
      type = lib.types.nullOr lib.types.path;
      default = null;
      example = ../../secrets/core-01.yaml;
      description = "Default SOPS file for this host or deployment.";
    };

    sshKeyPaths = lib.mkOption {
      type = lib.types.listOf types.absoluteRuntimePath;
      default = ["/etc/ssh/ssh_host_ed25519_key"];
      example = [
        "/etc/ssh/ssh_host_ed25519_key"
      ];
      description = "SSH key paths used by age for decryption.";
    };

    files = lib.mkOption {
      type = lib.types.attrsOf (lib.types.submodule ({name, ...}: {
        options = {
          key = lib.mkOption {
            type = types.sopsKeyName;
            default = name;
            example = "rauthy.env";
            description = "Key inside the SOPS document.";
          };

          path = lib.mkOption {
            type = types.absoluteRuntimePath;
            example = "/run/secrets/rauthy.env";
            description = "Runtime path used to materialize this secret file.";
          };

          owner = lib.mkOption {
            type = types.userOrGroupRef;
            default = "root";
            description = "Owner of the materialized file.";
          };

          group = lib.mkOption {
            type = types.userOrGroupRef;
            default = "root";
            description = "Group of the materialized file.";
          };

          mode = lib.mkOption {
            type = types.octalModeString;
            default = "0400";
            example = "0400";
            description = "Mode of the materialized file.";
          };

          restartUnits = lib.mkOption {
            type = lib.types.listOf types.systemdUnitName;
            default = [];
            example = [
              "podman-rauthy.service"
            ];
            description = "Units restarted when the secret changes.";
          };
        };
      }));
      default = {};
      description = "Secret files materialized by sops-nix under runtime paths.";
    };
  };

  config = lib.mkIf cfg.enable {
    assertions = [
      {
        assertion = cfg.defaultSopsFile != null;
        message = "void.secrets.sops.defaultSopsFile must be set when the sops baseline is enabled.";
      }
    ];

    sops = {
      inherit (cfg) defaultSopsFile;
      age.sshKeyPaths = cfg.sshKeyPaths;
      secrets =
        lib.mapAttrs (_: fileCfg: {
          inherit (fileCfg) key path owner group mode restartUnits;
          sopsFile = cfg.defaultSopsFile;
          format = "yaml";
        })
        cfg.files;
    };

    void.secrets.files.enable = lib.mkDefault true;
  };
}
