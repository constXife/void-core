{
  config,
  lib,
  pkgs,
  ...
}: let
  types = import ../../lib/types.nix {inherit lib;};
  cfg = config.void.data.postgresql;
  roleNameType = lib.types.strMatching "^[A-Za-z_][A-Za-z0-9_-]*$";
in {
  options.void.data.postgresql = {
    enable = lib.mkEnableOption "PostgreSQL foundation substrate";

    package = lib.mkOption {
      type = lib.types.package;
      default = pkgs.postgresql;
      example = lib.literalExpression "pkgs.postgresql_17";
      description = "PostgreSQL package used for the shared relational substrate.";
    };

    dataDir = lib.mkOption {
      type = lib.types.nullOr types.absoluteRuntimePath;
      default = null;
      example = "/var/lib/postgresql";
      description = "Optional override for the PostgreSQL data directory.";
    };

    port = lib.mkOption {
      type = lib.types.port;
      default = 5432;
      example = 5432;
      description = "TCP port exposed by PostgreSQL.";
    };

    listenAddresses = lib.mkOption {
      type = lib.types.listOf (lib.types.strMatching "^.+$");
      default = ["127.0.0.1"];
      example = [
        "127.0.0.1"
        "10.0.0.10"
      ];
      description = "Listen addresses forwarded into PostgreSQL listen_addresses.";
    };

    authentication = lib.mkOption {
      type = lib.types.lines;
      default = ''
        local all all peer
        host all all 127.0.0.1/32 scram-sha-256
        host all all ::1/128 scram-sha-256
      '';
      example = ''
        local all all peer
        host all all 127.0.0.1/32 scram-sha-256
        host all all 10.0.0.0/24 scram-sha-256
      '';
      description = "pg_hba.conf fragment used for PostgreSQL authentication.";
    };

    settings = lib.mkOption {
      type = lib.types.attrs;
      default = {};
      example = lib.literalExpression ''
        {
          shared_buffers = "256MB";
          max_connections = 200;
        }
      '';
      description = "Additional services.postgresql.settings entries.";
    };

    initialDatabases = lib.mkOption {
      type = lib.types.listOf roleNameType;
      default = [];
      example = [
        "rauthy"
        "atrium"
      ];
      description = "Databases ensured during bootstrap.";
    };

    initialUsers = lib.mkOption {
      type = lib.types.listOf (lib.types.submodule {
        options = {
          name = lib.mkOption {
            type = roleNameType;
            example = "atrium";
            description = "Role name ensured during bootstrap.";
          };

          ensureDBOwnership = lib.mkOption {
            type = lib.types.bool;
            default = false;
            example = true;
            description = "Whether PostgreSQL should transfer ownership of the same-named database to this role.";
          };

          ensureClauses = lib.mkOption {
            type = lib.types.attrs;
            default = {};
            example = lib.literalExpression ''
              {
                login = true;
              }
            '';
            description = "Additional ensureClauses forwarded to services.postgresql.ensureUsers.";
          };
        };
      });
      default = [];
      example = lib.literalExpression ''
        [
          {
            name = "rauthy";
            ensureDBOwnership = true;
            ensureClauses = {
              login = true;
            };
          }
        ]
      '';
      description = "Roles ensured during bootstrap.";
    };
  };

  assertions = [
    {
      assertion = !cfg.enable || cfg.authentication != "";
      message = "void.data.postgresql.enable requires a non-empty authentication contract.";
    }
    {
      assertion = lib.length (lib.unique cfg.initialDatabases) == lib.length cfg.initialDatabases;
      message = "void.data.postgresql.initialDatabases must not contain duplicates.";
    }
    {
      assertion = lib.length (lib.unique (map (user: user.name) cfg.initialUsers)) == lib.length cfg.initialUsers;
      message = "void.data.postgresql.initialUsers must not contain duplicate role names.";
    }
  ];

  config = lib.mkIf cfg.enable {
    services.postgresql =
      {
        enable = true;
        inherit (cfg) package authentication;
        enableTCPIP = cfg.listenAddresses != [];
        ensureDatabases = cfg.initialDatabases;
        ensureUsers =
          map (user: {
            inherit (user) name ensureDBOwnership ensureClauses;
          })
          cfg.initialUsers;
        settings =
          {
            inherit (cfg) port;
          }
          // lib.optionalAttrs (cfg.listenAddresses != []) {
            listen_addresses = lib.concatStringsSep "," cfg.listenAddresses;
          }
          // cfg.settings;
      }
      // lib.optionalAttrs (cfg.dataDir != null) {
        inherit (cfg) dataDir;
      };
  };
}
