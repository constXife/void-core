{
  config,
  lib,
  pkgs,
  ...
}: let
  cfg = config.void.auth.rauthy;
  configPath =
    if cfg.generatedConfigPath != null
    then cfg.generatedConfigPath
    else "/etc/rauthy/config.toml";
  templateScript = ''
    if [ ! -r ${lib.escapeShellArg cfg.envFile} ]; then
      echo "Missing ${cfg.envFile}; skipping Rauthy config generation" >&2
      exit 0
    fi

    if [ ! -r ${lib.escapeShellArg cfg.configTemplate} ]; then
      echo "Missing ${cfg.configTemplate}; skipping Rauthy config generation" >&2
      exit 0
    fi

    set -a
    . ${lib.escapeShellArg cfg.envFile}
    set +a

    ${lib.concatStringsSep "\n" (map (entry: ''
      : "''${${entry.envVar}:?Missing ${entry.envVar} in ${cfg.envFile}}"
    '') cfg.secretPlaceholders)}

    escape_sed() {
      printf '%s' "$1" | ${pkgs.gnused}/bin/sed -e 's/[\\/&|]/\\&/g'
    }

    tmp="$(${pkgs.coreutils}/bin/mktemp)"

    public_host=${lib.escapeShellArg cfg.publicHost}
    public_url=${lib.escapeShellArg "${cfg.publicScheme}://${cfg.publicHost}"}

    ${pkgs.gnused}/bin/sed \
    -e "s|__RAUTHY_PUBLIC_HOST__|$(escape_sed "$public_host")|g" \
    -e "s|__RAUTHY_PUBLIC_URL__|$(escape_sed "$public_url")|g" \
    ${lib.concatStringsSep " \\\n" (map (entry: ''
      -e "s|${entry.placeholder}|$(escape_sed "$(${pkgs.coreutils}/bin/printenv ${lib.escapeShellArg entry.envVar})")|g"'') cfg.secretPlaceholders)} \
      ${lib.escapeShellArg cfg.configTemplate} > "$tmp"

    ${pkgs.coreutils}/bin/install -D -m ${cfg.generatedConfigMode} -o ${cfg.generatedConfigOwner} -g ${cfg.generatedConfigGroup} "$tmp" ${lib.escapeShellArg configPath}
    ${pkgs.coreutils}/bin/rm -f "$tmp"
  '';
in {
  options.void.auth.rauthy = {
    enable = lib.mkEnableOption "Rauthy foundation integration";

    image = lib.mkOption {
      type = lib.types.str;
      default = "ghcr.io/sebadob/rauthy:0.34.1";
      description = "OCI image used for the Rauthy container.";
    };

    envFile = lib.mkOption {
      type = lib.types.str;
      default = "/run/secrets/rauthy.env";
      description = "Runtime env file with Rauthy secrets.";
    };

    configTemplate = lib.mkOption {
      type = lib.types.nullOr lib.types.path;
      default = null;
      description = "Template file used to generate the runtime config.";
    };

    publicHost = lib.mkOption {
      type = lib.types.nullOr lib.types.str;
      default = config.void.services.id.fqdn;
      description = "Public hostname used for the Rauthy endpoint.";
    };

    publicScheme = lib.mkOption {
      type = lib.types.str;
      default = "https";
      description = "Public URL scheme used for Rauthy external links.";
    };

    generatedConfigPath = lib.mkOption {
      type = lib.types.nullOr lib.types.str;
      default = "/etc/rauthy/config.toml";
      description = "Generated runtime config path for Rauthy.";
    };

    generatedConfigOwner = lib.mkOption {
      type = lib.types.str;
      default = "10001";
      description = "Owner of the generated config file.";
    };

    generatedConfigGroup = lib.mkOption {
      type = lib.types.str;
      default = "10001";
      description = "Group of the generated config file.";
    };

    generatedConfigMode = lib.mkOption {
      type = lib.types.str;
      default = "0640";
      description = "Mode of the generated config file.";
    };

    dataDir = lib.mkOption {
      type = lib.types.str;
      default = "/var/lib/rauthy";
      description = "Persistent data directory for Rauthy.";
    };

    hostAddress = lib.mkOption {
      type = lib.types.str;
      default = "127.0.0.1";
      description = "Host bind address for the exposed HTTP port.";
    };

    hostPort = lib.mkOption {
      type = lib.types.port;
      default = 8080;
      description = "Host HTTP port for Rauthy.";
    };

    containerPort = lib.mkOption {
      type = lib.types.port;
      default = 8080;
      description = "Container HTTP port for Rauthy.";
    };

    extraPorts = lib.mkOption {
      type = lib.types.listOf lib.types.str;
      default = [];
      description = "Additional podman port mappings exposed for the Rauthy container.";
    };

    podmanExtraOptions = lib.mkOption {
      type = lib.types.listOf lib.types.str;
      default = [];
      description = "Additional podman options for the Rauthy container.";
    };

    secretPlaceholders = lib.mkOption {
      type = lib.types.listOf (lib.types.submodule ({ ... }: {
        options = {
          envVar = lib.mkOption {
            type = lib.types.str;
            description = "Environment variable expected in the env file.";
          };
          placeholder = lib.mkOption {
            type = lib.types.str;
            description = "Placeholder to replace in the config template.";
          };
        };
      }));
      default = [
        {
          envVar = "HQL_SECRET_RAFT";
          placeholder = "__HQL_SECRET_RAFT__";
        }
        {
          envVar = "HQL_SECRET_API";
          placeholder = "__HQL_SECRET_API__";
        }
        {
          envVar = "RAUTHY_ENCRYPTION_KEYS";
          placeholder = "__RAUTHY_ENCRYPTION_KEYS__";
        }
        {
          envVar = "RAUTHY_KEY_ACTIVE";
          placeholder = "__RAUTHY_KEY_ACTIVE__";
        }
      ];
      description = "Template placeholders populated from the runtime env file.";
    };
  };

  config = lib.mkIf cfg.enable {
    assertions = [
      {
        assertion = cfg.configTemplate != null;
        message = "void.auth.rauthy.configTemplate must be set when Rauthy is enabled.";
      }
      {
        assertion = cfg.publicHost != null;
        message = "void.auth.rauthy.publicHost must be set when Rauthy is enabled.";
      }
    ];

    virtualisation.oci-containers.backend = lib.mkDefault "podman";
    virtualisation.oci-containers.containers.rauthy = {
      image = cfg.image;
      autoStart = true;
      environmentFiles = [];
      ports = [
        "${cfg.hostAddress}:${toString cfg.hostPort}:${toString cfg.containerPort}"
      ] ++ cfg.extraPorts;
      volumes = [
        "${configPath}:/app/config.toml:ro"
        "${cfg.dataDir}:/app/data"
      ];
      extraOptions = cfg.podmanExtraOptions;
    };

    systemd.services."podman-rauthy".serviceConfig.EnvironmentFile = [
      "-${cfg.envFile}"
    ];
    systemd.services."podman-rauthy".unitConfig.ConditionPathExists = [
      cfg.envFile
      cfg.configTemplate
    ];

    systemd.tmpfiles.rules = [
      "d ${cfg.dataDir} 0700 ${cfg.generatedConfigOwner} ${cfg.generatedConfigGroup} -"
    ];

    system.activationScripts.void-rauthy-config = templateScript;
  };
}
