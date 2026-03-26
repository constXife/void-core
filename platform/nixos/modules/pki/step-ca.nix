{
  config,
  lib,
  ...
}: let
  types = import ../../lib/types.nix {inherit lib;};
  cfg = config.void.trust.stepCa;
in {
  options.void.trust.stepCa = {
    enable = lib.mkEnableOption "step-ca private CA baseline";

    address = lib.mkOption {
      # governance-open-contract: step-ca may bind wildcard or specific addresses.
      type = lib.types.str;
      default = "0.0.0.0";
      example = "0.0.0.0";
      description = "Bind address for step-ca.";
    };

    port = lib.mkOption {
      type = lib.types.port;
      default = 9000;
      description = "HTTPS port exposed by step-ca.";
    };

    settingsFile = lib.mkOption {
      type = lib.types.nullOr lib.types.path;
      default = null;
      example = ./step-ca.json;
      description = "Optional evaluated JSON config for step-ca.";
    };

    runtimeConfigFile = lib.mkOption {
      type = lib.types.nullOr types.absoluteRuntimePath;
      default = null;
      example = "/run/secrets/step-ca.json";
      description = "Runtime JSON config path used by the step-ca systemd unit.";
    };

    intermediatePasswordFile = lib.mkOption {
      type = lib.types.nullOr types.absoluteRuntimePath;
      default = "/var/lib/step-ca/secrets/intermediate_password";
      example = "/var/lib/step-ca/secrets/intermediate_password";
      description = "Password file used for the intermediate CA key.";
    };

    rootCaCertificate = lib.mkOption {
      type = lib.types.nullOr lib.types.path;
      default = null;
      description = "Root CA certificate added to the local system trust store.";
    };

    publicRootDir = lib.mkOption {
      type = types.absoluteRuntimePath;
      default = "/var/lib/step-ca/public";
      example = "/var/lib/step-ca/public";
      description = "Directory that exposes root CA material for bootstrap download.";
    };
  };

  config = lib.mkIf cfg.enable (lib.mkMerge [
    {
      assertions = [
        {
          assertion = cfg.settingsFile != null || cfg.runtimeConfigFile != null;
          message = "void.trust.stepCa requires settingsFile or runtimeConfigFile.";
        }
      ];

      services.step-ca =
        {
          enable = true;
          inherit (cfg) address port intermediatePasswordFile;
          settings = lib.mkDefault {};
        }
        // lib.optionalAttrs (cfg.settingsFile != null) {
          settings = builtins.fromJSON (builtins.readFile cfg.settingsFile);
        };

      networking.firewall.allowedTCPPorts = [cfg.port];
    }

    (lib.mkIf (cfg.runtimeConfigFile != null) {
      systemd.services.step-ca.serviceConfig.ExecStart = lib.mkForce [
        ""
        (
          "${config.services.step-ca.package}/bin/step-ca ${cfg.runtimeConfigFile}"
          + lib.optionalString (cfg.intermediatePasswordFile != null)
          " --password-file ${"$"}{CREDENTIALS_DIRECTORY}/intermediate_password"
        )
      ];

      systemd.services.step-ca.unitConfig.ConditionPathExists = cfg.runtimeConfigFile;
    })

    (lib.mkIf (cfg.rootCaCertificate != null) {
      security.pki.certificateFiles = [
        cfg.rootCaCertificate
      ];
    })
  ]);
}
