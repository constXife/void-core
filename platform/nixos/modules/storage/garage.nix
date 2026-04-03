{
  config,
  lib,
  pkgs,
  ...
}: let
  types = import ../../lib/types.nix {inherit lib;};
  cfg = config.void.storage.garage;
  bindAddressType = lib.types.strMatching "^.+:[0-9]+$";
  rootDomainType = lib.types.strMatching "^\\..+$";
in {
  options.void.storage.garage = {
    enable = lib.mkEnableOption "Garage foundation object storage";

    package = lib.mkOption {
      type = lib.types.package;
      default = pkgs.garage;
      example = lib.literalExpression "pkgs.garage_2";
      description = "Garage package used for the object-storage substrate.";
    };

    logLevel = lib.mkOption {
      type = lib.types.enum [
        "error"
        "warn"
        "info"
        "debug"
        "trace"
      ];
      default = "info";
      example = "debug";
      description = "Garage log level.";
    };

    metadataDir = lib.mkOption {
      type = types.absoluteRuntimePath;
      default = "/var/lib/garage/meta";
      example = "/var/lib/garage/meta";
      description = "Metadata directory for Garage.";
    };

    dataDir = lib.mkOption {
      type = types.absoluteRuntimePath;
      default = "/var/lib/garage/data";
      example = "/var/lib/garage/data";
      description = "Data directory for Garage object blocks.";
    };

    replicationFactor = lib.mkOption {
      type = lib.types.ints.positive;
      default = 1;
      example = 3;
      description = "Garage replication_factor.";
    };

    consistencyMode = lib.mkOption {
      type = lib.types.enum [
        "consistent"
        "degraded"
      ];
      default = "consistent";
      example = "consistent";
      description = "Garage consistency_mode.";
    };

    rpcBindAddress = lib.mkOption {
      type = bindAddressType;
      default = "127.0.0.1:3901";
      example = "0.0.0.0:3901";
      description = "Garage RPC bind address.";
    };

    rpcPublicAddress = lib.mkOption {
      type = bindAddressType;
      default = "127.0.0.1:3901";
      example = "storage.site.home.arpa:3901";
      description = "Garage RPC public address advertised to peers.";
    };

    rpcSecretFile = lib.mkOption {
      type = types.absoluteRuntimePath;
      default = "/run/secrets/garage-rpc-secret";
      example = "/run/secrets/garage-rpc-secret";
      description = "Runtime file containing the Garage RPC secret.";
    };

    s3ApiBindAddress = lib.mkOption {
      type = bindAddressType;
      default = "127.0.0.1:3900";
      example = "127.0.0.1:3900";
      description = "Bind address for the Garage S3 API.";
    };

    s3Region = lib.mkOption {
      type = lib.types.strMatching "^[A-Za-z0-9._-]+$";
      default = "garage";
      example = "home";
      description = "Garage S3 region name.";
    };

    s3RootDomain = lib.mkOption {
      type = lib.types.nullOr rootDomainType;
      default = null;
      example = ".s3.site.home.arpa";
      description = "Optional root_domain for virtual-hosted S3 access.";
    };

    webBindAddress = lib.mkOption {
      type = lib.types.nullOr bindAddressType;
      default = null;
      example = "127.0.0.1:3902";
      description = "Optional bind address for Garage website hosting.";
    };

    webRootDomain = lib.mkOption {
      type = lib.types.nullOr rootDomainType;
      default = null;
      example = ".web.site.home.arpa";
      description = "Optional root_domain for Garage website hosting.";
    };

    adminBindAddress = lib.mkOption {
      type = lib.types.nullOr bindAddressType;
      default = null;
      example = "127.0.0.1:3903";
      description = "Optional bind address for the Garage admin API.";
    };

    adminTokenFile = lib.mkOption {
      type = lib.types.nullOr types.absoluteRuntimePath;
      default = null;
      example = "/run/secrets/garage-admin-token";
      description = "Optional runtime file containing the Garage admin token.";
    };

    metricsTokenFile = lib.mkOption {
      type = lib.types.nullOr types.absoluteRuntimePath;
      default = null;
      example = "/run/secrets/garage-metrics-token";
      description = "Optional runtime file containing the Garage metrics token.";
    };

    extraEnvironment = lib.mkOption {
      type = lib.types.attrsOf lib.types.str;
      default = {};
      example = {
        GARAGE_LOG_TO_JOURNALD = "1";
      };
      description = "Extra environment variables passed to the Garage service.";
    };

    extraSettings = lib.mkOption {
      type = lib.types.attrs;
      default = {};
      example = lib.literalExpression ''
        {
          block_size = "1M";
        }
      '';
      description = "Additional Garage configuration merged into services.garage.settings.";
    };
  };

  config = lib.mkMerge [
    {
      assertions = [
        {
          assertion = cfg.adminTokenFile == null || cfg.adminBindAddress != null;
          message = "void.storage.garage.adminTokenFile requires adminBindAddress to expose the admin API.";
        }
        {
          assertion = cfg.metricsTokenFile == null || cfg.adminBindAddress != null;
          message = "void.storage.garage.metricsTokenFile requires adminBindAddress to expose the admin API.";
        }
        {
          assertion = cfg.webRootDomain == null || cfg.webBindAddress != null;
          message = "void.storage.garage.webRootDomain requires webBindAddress.";
        }
      ];
    }
    (lib.mkIf cfg.enable {
      services.garage = {
        enable = true;
        inherit (cfg) package logLevel extraEnvironment;
        settings =
          {
            replication_factor = cfg.replicationFactor;
            consistency_mode = cfg.consistencyMode;
            metadata_dir = cfg.metadataDir;
            data_dir = cfg.dataDir;
            rpc_bind_addr = cfg.rpcBindAddress;
            rpc_public_addr = cfg.rpcPublicAddress;
            rpc_secret_file = cfg.rpcSecretFile;
            s3_api =
              {
                api_bind_addr = cfg.s3ApiBindAddress;
                s3_region = cfg.s3Region;
              }
              // lib.optionalAttrs (cfg.s3RootDomain != null) {
                root_domain = cfg.s3RootDomain;
              };
          }
          // lib.optionalAttrs (cfg.webBindAddress != null) {
            s3_web =
              {
                bind_addr = cfg.webBindAddress;
              }
              // lib.optionalAttrs (cfg.webRootDomain != null) {
                root_domain = cfg.webRootDomain;
              };
          }
          // lib.optionalAttrs (cfg.adminBindAddress != null) {
            admin =
              {
                api_bind_addr = cfg.adminBindAddress;
              }
              // lib.optionalAttrs (cfg.adminTokenFile != null) {
                admin_token_file = cfg.adminTokenFile;
              }
              // lib.optionalAttrs (cfg.metricsTokenFile != null) {
                metrics_token_file = cfg.metricsTokenFile;
              };
          }
          // cfg.extraSettings;
      };
    })
  ];
}
