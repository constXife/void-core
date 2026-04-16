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
  bucketNameType = lib.types.strMatching "^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$";
  keyNameType = lib.types.strMatching "^[A-Za-z0-9._-]+$";
  quotaSizeType = lib.types.strMatching "^(none|[0-9]+[A-Za-z]+)$";
  websiteDocumentType = lib.types.strMatching "^[A-Za-z0-9._/-]+$";
  quote = lib.escapeShellArg;
  provisionCfg = cfg.provision;
  provisionStateDir = "/var/lib/void/garage-provision";
  provisionSecretFiles = lib.concatMap (account: [
    account.keyIdFile
    account.secretKeyFile
  ]) (lib.attrValues provisionCfg.serviceAccounts);
  serviceAccountCommands =
    lib.mapAttrsToList (name: account: ''
      if ! garage key info ${quote name} >/dev/null 2>&1; then
        garage key import \
          "$(${pkgs.coreutils}/bin/tr -d '\r\n' < ${quote account.keyIdFile})" \
          "$(${pkgs.coreutils}/bin/tr -d '\r\n' < ${quote account.secretKeyFile})" \
          -n ${quote name} \
          --yes \
          >/dev/null
      fi
    '')
    provisionCfg.serviceAccounts;
  bucketCommands =
    lib.mapAttrsToList (name: bucket: ''
      if ! garage bucket info ${quote name} >/dev/null 2>&1; then
        garage bucket create ${quote name}
      fi
      ${lib.optionalString bucket.website.enable ''
        garage bucket website --allow ${quote name} \
          -i ${quote bucket.website.indexDocument} \
          ${lib.optionalString (bucket.website.errorDocument != null) "-e ${quote bucket.website.errorDocument}"}
      ''}
      ${lib.optionalString (bucket.maxSize != null || bucket.maxObjects != null) ''
        garage bucket set-quotas ${quote name} \
          ${
          if bucket.maxSize != null
          then "--max-size ${quote bucket.maxSize}"
          else "--max-size none"
        } \
          ${
          if bucket.maxObjects != null
          then "--max-objects ${toString bucket.maxObjects}"
          else "--max-objects none"
        }
      ''}
    '')
    provisionCfg.buckets;
  grantCommands =
    map (grant: ''
      garage bucket allow \
        ${lib.optionalString grant.read "--read "}\
        ${lib.optionalString grant.write "--write "}\
        ${lib.optionalString grant.owner "--owner "}\
        ${quote grant.bucket} \
        --key ${quote grant.serviceAccount}
    '')
    provisionCfg.grants;
  provisionScript = pkgs.writeShellScript "void-garage-provision" ''
    set -euo pipefail

    export GARAGE_CONFIG_FILE=/etc/garage.toml
    export GARAGE_RPC_SECRET_FILE=${quote cfg.rpcSecretFile}
    export GARAGE_ADMIN_TOKEN_FILE=${quote cfg.adminTokenFile}

    for _ in $(seq 1 ${toString provisionCfg.waitForSeconds}); do
      if garage status >/dev/null 2>&1; then
        break
      fi
      sleep 1
    done

    garage status >/dev/null

    ${lib.concatStringsSep "\n" serviceAccountCommands}
    ${lib.concatStringsSep "\n" bucketCommands}
    ${lib.concatStringsSep "\n" grantCommands}
    ${provisionCfg.extraCommands}

    ${pkgs.coreutils}/bin/install -d -m 0750 ${quote provisionStateDir}
    ${pkgs.coreutils}/bin/touch ${quote "${provisionStateDir}/applied"}
  '';
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

    provision = {
      enable = lib.mkEnableOption "declarative Garage provisioning for buckets, service accounts, and grants";

      waitForSeconds = lib.mkOption {
        type = lib.types.ints.positive;
        default = 60;
        example = 120;
        description = "How long the provisioning service waits for Garage to become reachable.";
      };

      serviceAccounts = lib.mkOption {
        type = lib.types.attrsOf (lib.types.submodule ({name, ...}: {
          options = {
            keyIdFile = lib.mkOption {
              type = types.absoluteRuntimePath;
              example = "/run/secrets/garage-assets-key-id";
              description = "Runtime file containing the S3 access key ID for service account `${name}`.";
            };

            secretKeyFile = lib.mkOption {
              type = types.absoluteRuntimePath;
              example = "/run/secrets/garage-assets-secret-key";
              description = "Runtime file containing the S3 secret key for service account `${name}`.";
            };
          };
        }));
        default = {};
        example = lib.literalExpression ''
          {
            assets = {
              keyIdFile = "/run/secrets/garage-assets-key-id";
              secretKeyFile = "/run/secrets/garage-assets-secret-key";
            };
          }
        '';
        description = ''
          Declarative Garage S3 service accounts keyed by logical key name.
          Values are imported idempotently through `garage key import`.
        '';
      };

      buckets = lib.mkOption {
        type = lib.types.attrsOf (lib.types.submodule ({name, ...}: {
          options = {
            maxSize = lib.mkOption {
              type = lib.types.nullOr quotaSizeType;
              default = null;
              example = "20GiB";
              description = "Optional max-size quota for bucket `${name}`.";
            };

            maxObjects = lib.mkOption {
              type = lib.types.nullOr lib.types.ints.positive;
              default = null;
              example = 500000;
              description = "Optional max-objects quota for bucket `${name}`.";
            };

            website = {
              enable = lib.mkEnableOption "Garage website hosting for bucket `${name}`";

              indexDocument = lib.mkOption {
                type = websiteDocumentType;
                default = "index.html";
                example = "index.html";
                description = "Index document used when website hosting is enabled.";
              };

              errorDocument = lib.mkOption {
                type = lib.types.nullOr websiteDocumentType;
                default = null;
                example = "404.html";
                description = "Optional error document used when website hosting is enabled.";
              };
            };
          };
        }));
        default = {};
        example = lib.literalExpression ''
          {
            arkham-assets = {};
            arkham-static = {
              website.enable = true;
            };
          }
        '';
        description = ''
          Declarative Garage buckets keyed by bucket name.
          Buckets are created idempotently and may optionally receive quotas or website settings.
        '';
      };

      grants = lib.mkOption {
        type = lib.types.listOf (lib.types.submodule {
          options = {
            bucket = lib.mkOption {
              type = bucketNameType;
              example = "arkham-assets";
              description = "Target bucket name.";
            };

            serviceAccount = lib.mkOption {
              type = keyNameType;
              example = "assets";
              description = "Logical service account name from `void.storage.garage.provision.serviceAccounts`.";
            };

            read = lib.mkOption {
              type = lib.types.bool;
              default = false;
              description = "Whether the service account may read objects from the bucket.";
            };

            write = lib.mkOption {
              type = lib.types.bool;
              default = false;
              description = "Whether the service account may write objects to the bucket.";
            };

            owner = lib.mkOption {
              type = lib.types.bool;
              default = false;
              description = "Whether the service account may perform administrative bucket operations.";
            };
          };
        });
        default = [];
        example = lib.literalExpression ''
          [
            {
              bucket = "arkham-assets";
              serviceAccount = "assets";
              read = true;
              write = true;
            }
          ]
        '';
        description = "Declarative bucket grants applied through `garage bucket allow`.";
      };

      extraCommands = lib.mkOption {
        type = lib.types.lines;
        default = "";
        example = ''
          garage bucket alias arkham-assets assets
        '';
        description = ''
          Extra shell commands appended to the end of the provisioning service.
          Use this as an escape hatch for client-specific Garage provisioning that does not yet justify a first-class option.
        '';
      };
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
        {
          assertion = !provisionCfg.enable || cfg.enable;
          message = "void.storage.garage.provision.enable requires void.storage.garage.enable.";
        }
        {
          assertion = !provisionCfg.enable || cfg.adminBindAddress != null;
          message = "void.storage.garage.provision.enable requires adminBindAddress.";
        }
        {
          assertion = !provisionCfg.enable || cfg.adminTokenFile != null;
          message = "void.storage.garage.provision.enable requires adminTokenFile.";
        }
        {
          assertion =
            lib.all
            (name: builtins.match "^[A-Za-z0-9._-]+$" name != null)
            (builtins.attrNames provisionCfg.serviceAccounts);
          message = "Garage provision.serviceAccounts names may contain only ASCII letters, digits, dot, underscore, and dash.";
        }
        {
          assertion =
            lib.all
            (name: builtins.match "^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$" name != null)
            (builtins.attrNames provisionCfg.buckets);
          message = "Garage provision.buckets attribute names must be valid bucket names.";
        }
        {
          assertion =
            lib.all
            (grant: grant.read || grant.write || grant.owner)
            provisionCfg.grants;
          message = "Each Garage provision grant must enable at least one of read, write, or owner.";
        }
        {
          assertion =
            lib.all
            (grant: builtins.hasAttr grant.bucket provisionCfg.buckets)
            provisionCfg.grants;
          message = "Each Garage provision grant must reference a declared bucket.";
        }
        {
          assertion =
            lib.all
            (grant: builtins.hasAttr grant.serviceAccount provisionCfg.serviceAccounts)
            provisionCfg.grants;
          message = "Each Garage provision grant must reference a declared service account.";
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
    (lib.mkIf provisionCfg.enable {
      systemd.services.void-garage-provision = {
        description = "Declarative Garage provisioning";
        after = [
          "garage.service"
          "network-online.target"
        ];
        wants = ["network-online.target"];
        requires = ["garage.service"];
        wantedBy = ["multi-user.target"];
        restartTriggers = [provisionScript] ++ provisionSecretFiles;
        serviceConfig = {
          Type = "oneshot";
          RemainAfterExit = true;
          RuntimeDirectory = "void-garage-provision";
        };
        path = [cfg.package pkgs.coreutils];
        script = ''
          ${provisionScript}
        '';
      };
    })
  ];
}
