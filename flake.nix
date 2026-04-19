{
  description = "Public foundation repository for reusable self-hosted building blocks";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-25.11";

    sops-nix.url = "github:Mic92/sops-nix";
    sops-nix.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs = {
    self,
    nixpkgs,
    sops-nix,
    ...
  }: let
    inherit (nixpkgs) lib;
    nixosTypes = import ./platform/nixos/lib/types.nix {inherit lib;};

    systems = [
      "x86_64-linux"
      "aarch64-linux"
      "x86_64-darwin"
      "aarch64-darwin"
    ];

    forAllSystems = f: lib.genAttrs systems (system: f (pkgsFor system));
    pkgsFor = system: import nixpkgs {inherit system;};

    foundationModule = {
      imports = [
        sops-nix.nixosModules.sops
        ./platform/nixos/modules/naming
        ./platform/nixos/modules/data
        ./platform/nixos/modules/auth
        ./platform/nixos/modules/dns
        ./platform/nixos/modules/ingress
        ./platform/nixos/modules/pki
        ./platform/nixos/modules/shell
        ./platform/nixos/modules/storage
        ./platform/nixos/modules/status
        ./platform/nixos/modules/secrets/files.nix
        ./platform/nixos/modules/secrets/sops-baseline.nix
      ];
    };

    mkFoundationOptionsDoc = pkgs: let
      docsModule = {
        options = {
          void = {
            site.domain = lib.mkOption {
              type = nixosTypes.fqdn;
              default = "site.home.arpa";
              description = "Canonical site domain for this deployment.";
            };

            network = {
              dns.mode = lib.mkOption {
                type = lib.types.enum [
                  "hosts"
                  "local-resolver"
                  "external"
                ];
                default = "local-resolver";
                description = "How client devices resolve private service names.";
              };

              tls.mode = lib.mkOption {
                type = lib.types.enum [
                  "private-ca"
                  "acme"
                  "external"
                ];
                default = "private-ca";
                description = "How TLS certificates are obtained for private endpoints.";
              };
            };

            services = {
              atrium = {
                subdomain = lib.mkOption {
                  type = lib.types.nullOr nixosTypes.dnsLabel;
                  default = "atrium";
                  description = "Subdomain used for the Atrium shell endpoint.";
                };

                fqdn = lib.mkOption {
                  type = lib.types.nullOr nixosTypes.fqdn;
                  default = null;
                  readOnly = true;
                  description = "Fully-qualified domain name for the Atrium shell endpoint.";
                };
              };

              api = {
                subdomain = lib.mkOption {
                  type = lib.types.nullOr nixosTypes.dnsLabel;
                  default = "api";
                  description = "Subdomain used for the canonical product API endpoint.";
                };

                fqdn = lib.mkOption {
                  type = lib.types.nullOr nixosTypes.fqdn;
                  default = null;
                  readOnly = true;
                  description = "Fully-qualified domain name for the canonical product API endpoint.";
                };
              };

              mcp = {
                subdomain = lib.mkOption {
                  type = lib.types.nullOr nixosTypes.dnsLabel;
                  default = "mcp";
                  description = "Subdomain used for the MCP and tooling endpoint.";
                };

                fqdn = lib.mkOption {
                  type = lib.types.nullOr nixosTypes.fqdn;
                  default = null;
                  readOnly = true;
                  description = "Fully-qualified domain name for the MCP and tooling endpoint.";
                };
              };

              calendar = {
                subdomain = lib.mkOption {
                  type = lib.types.nullOr nixosTypes.dnsLabel;
                  default = "calendar";
                  description = "Subdomain used for the calendar-facing product host.";
                };

                fqdn = lib.mkOption {
                  type = lib.types.nullOr nixosTypes.fqdn;
                  default = null;
                  readOnly = true;
                  description = "Fully-qualified domain name for the calendar-facing product host.";
                };
              };

              inventory = {
                subdomain = lib.mkOption {
                  type = lib.types.nullOr nixosTypes.dnsLabel;
                  default = "inventory";
                  description = "Subdomain used for the inventory-facing product host.";
                };

                fqdn = lib.mkOption {
                  type = lib.types.nullOr nixosTypes.fqdn;
                  default = null;
                  readOnly = true;
                  description = "Fully-qualified domain name for the inventory-facing product host.";
                };
              };

              finance = {
                subdomain = lib.mkOption {
                  type = lib.types.nullOr nixosTypes.dnsLabel;
                  default = "finance";
                  description = "Subdomain used for the finance-facing product host.";
                };

                fqdn = lib.mkOption {
                  type = lib.types.nullOr nixosTypes.fqdn;
                  default = null;
                  readOnly = true;
                  description = "Fully-qualified domain name for the finance-facing product host.";
                };
              };

              id = {
                subdomain = lib.mkOption {
                  type = lib.types.nullOr nixosTypes.dnsLabel;
                  default = "id";
                  description = "Subdomain used for the identity endpoint.";
                };

                fqdn = lib.mkOption {
                  type = lib.types.nullOr nixosTypes.fqdn;
                  default = null;
                  readOnly = true;
                  description = "Fully-qualified domain name for the identity endpoint.";
                };
              };

              ca = {
                subdomain = lib.mkOption {
                  type = lib.types.nullOr nixosTypes.dnsLabel;
                  default = "ca";
                  description = "Subdomain used for the private CA endpoint.";
                };

                fqdn = lib.mkOption {
                  type = lib.types.nullOr nixosTypes.fqdn;
                  default = null;
                  readOnly = true;
                  description = "Fully-qualified domain name for the private CA endpoint.";
                };
              };

              s3 = {
                subdomain = lib.mkOption {
                  type = lib.types.nullOr nixosTypes.dnsLabel;
                  default = "s3";
                  description = "Subdomain used for the object-storage endpoint.";
                };

                fqdn = lib.mkOption {
                  type = lib.types.nullOr nixosTypes.fqdn;
                  default = null;
                  readOnly = true;
                  description = "Fully-qualified domain name for the object-storage endpoint.";
                };
              };
            };

            auth = {
              rauthy = {
                enable = lib.mkEnableOption "Rauthy foundation integration";
                image = lib.mkOption {
                  type = lib.types.str;
                  default = "ghcr.io/sebadob/rauthy:0.34.1";
                  description = "OCI image used for the Rauthy container.";
                };
                envFile = lib.mkOption {
                  type = nixosTypes.absoluteRuntimePath;
                  default = "/run/secrets/rauthy.env";
                  description = "Runtime env file with Rauthy secrets.";
                };
                templateExtraEnvFiles = lib.mkOption {
                  type = lib.types.listOf nixosTypes.absoluteRuntimePath;
                  default = [];
                  description = "Additional env files sourced during config template rendering.";
                };
                configTemplate = lib.mkOption {
                  type = lib.types.nullOr lib.types.path;
                  default = null;
                  description = "Template file used to generate the runtime config.";
                };
                publicHost = lib.mkOption {
                  type = lib.types.nullOr nixosTypes.fqdn;
                  default = null;
                  description = "Public hostname used for the Rauthy endpoint.";
                };
                publicScheme = lib.mkOption {
                  type = lib.types.enum [
                    "http"
                    "https"
                  ];
                  default = "https";
                  description = "Public URL scheme used for Rauthy external links.";
                };
                bootstrapAdminEmail = lib.mkOption {
                  type = nixosTypes.emailAddress;
                  default = "admin@example.internal";
                  description = "Bootstrap admin e-mail rendered into the Rauthy config template.";
                };
                bootstrapAdminPasswordEnvVar = lib.mkOption {
                  type = lib.types.nullOr nixosTypes.envVarName;
                  default = null;
                  description = "Optional env var containing the bootstrap admin password to hash into the config template.";
                };
                generatedConfigPath = lib.mkOption {
                  type = lib.types.nullOr nixosTypes.absoluteRuntimePath;
                  default = "/etc/rauthy/config.toml";
                  description = "Generated runtime config path for Rauthy.";
                };
                generatedConfigOwner = lib.mkOption {
                  type = nixosTypes.userOrGroupRef;
                  default = "10001";
                  description = "Owner of the generated config file.";
                };
                generatedConfigGroup = lib.mkOption {
                  type = nixosTypes.userOrGroupRef;
                  default = "10001";
                  description = "Group of the generated config file.";
                };
                generatedConfigMode = lib.mkOption {
                  type = nixosTypes.octalModeString;
                  default = "0640";
                  description = "Mode of the generated config file.";
                };
                dataDir = lib.mkOption {
                  type = nixosTypes.absoluteRuntimePath;
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
                  type = lib.types.listOf (lib.types.submodule (_: {
                    options = {
                      envVar = lib.mkOption {
                        type = nixosTypes.envVarName;
                        description = "Environment variable expected in the env file.";
                      };
                      placeholder = lib.mkOption {
                        type = nixosTypes.placeholderToken;
                        description = "Placeholder to replace in the config template.";
                      };
                    };
                  }));
                  default = [];
                  description = "Template placeholders populated from the runtime env file.";
                };
              };
            };

            data = {
              postgresql = {
                enable = lib.mkEnableOption "PostgreSQL foundation substrate";
                package = lib.mkOption {
                  type = lib.types.package;
                  description = "PostgreSQL package used for the shared relational substrate.";
                };
                dataDir = lib.mkOption {
                  type = lib.types.nullOr nixosTypes.absoluteRuntimePath;
                  default = null;
                  description = "Optional override for the PostgreSQL data directory.";
                };
                port = lib.mkOption {
                  type = lib.types.port;
                  default = 5432;
                  description = "TCP port exposed by PostgreSQL.";
                };
                listenAddresses = lib.mkOption {
                  type = lib.types.listOf (lib.types.strMatching "^.+$");
                  default = ["127.0.0.1"];
                  description = "Listen addresses forwarded into PostgreSQL listen_addresses.";
                };
                authentication = lib.mkOption {
                  type = lib.types.lines;
                  default = "";
                  description = "pg_hba.conf fragment used for PostgreSQL authentication.";
                };
                settings = lib.mkOption {
                  type = lib.types.attrs;
                  default = {};
                  description = "Additional services.postgresql.settings entries.";
                };
                initialDatabases = lib.mkOption {
                  type = lib.types.listOf (lib.types.strMatching "^[A-Za-z_][A-Za-z0-9_-]*$");
                  default = [];
                  description = "Databases ensured during bootstrap.";
                };
                initialUsers = lib.mkOption {
                  type = lib.types.listOf (lib.types.submodule {
                    options = {
                      name = lib.mkOption {
                        type = lib.types.strMatching "^[A-Za-z_][A-Za-z0-9_-]*$";
                        description = "Role name ensured during bootstrap.";
                      };
                      ensureDBOwnership = lib.mkOption {
                        type = lib.types.bool;
                        default = false;
                        description = "Whether PostgreSQL should transfer ownership of the same-named database to this role.";
                      };
                      ensureClauses = lib.mkOption {
                        type = lib.types.attrs;
                        default = {};
                        description = "Additional ensureClauses forwarded to services.postgresql.ensureUsers.";
                      };
                    };
                  });
                  default = [];
                  description = "Roles ensured during bootstrap.";
                };
              };
            };

            dns = {
              coredns = {
                enable = lib.mkEnableOption "CoreDNS foundation baseline";
                zoneName = lib.mkOption {
                  type = nixosTypes.fqdn;
                  default = "site.home.arpa";
                  description = "Authoritative zone served by CoreDNS.";
                };
                zoneFile = lib.mkOption {
                  type = lib.types.nullOr lib.types.path;
                  default = null;
                  description = "Zone file used for the authoritative private zone.";
                };
                allowCidrs = lib.mkOption {
                  type = lib.types.listOf nixosTypes.cidr;
                  default = ["127.0.0.0/8"];
                  description = "CIDRs allowed to query the resolver.";
                };
                upstreamResolvers = lib.mkOption {
                  type = lib.types.listOf lib.types.str;
                  default = [];
                  description = "Upstream resolvers used for non-authoritative queries.";
                };
              };
            };

            ingress = {
              caddy = {
                enable = lib.mkEnableOption "Caddy ingress baseline";
                package = lib.mkOption {
                  type = lib.types.package;
                  description = "Caddy package used for the ingress baseline.";
                };
                acmeCA = lib.mkOption {
                  type = lib.types.nullOr nixosTypes.httpUrl;
                  default = null;
                  description = "Custom ACME directory URL used by Caddy.";
                };
                globalConfig = lib.mkOption {
                  type = lib.types.lines;
                  default = "auto_https disable_redirects";
                  description = "Extra global Caddyfile configuration.";
                };
                exposeIdentity = lib.mkOption {
                  type = lib.types.bool;
                  default = true;
                  description = "Whether to publish the identity endpoint via Caddy.";
                };
                idUpstream = lib.mkOption {
                  type = nixosTypes.httpUrl;
                  default = "http://127.0.0.1:8080";
                  description = "Upstream for the identity endpoint.";
                };
                exposeCa = lib.mkOption {
                  type = lib.types.bool;
                  default = true;
                  description = "Whether to publish the private CA endpoint via Caddy.";
                };
                caUpstream = lib.mkOption {
                  type = nixosTypes.httpUrl;
                  default = "https://127.0.0.1:9000";
                  description = "Upstream for the private CA endpoint.";
                };
                caPublicRoot = lib.mkOption {
                  type = nixosTypes.absoluteRuntimePath;
                  default = "/var/lib/step-ca/public";
                  description = "Directory used to serve public CA bootstrap material over HTTP.";
                };
                publishedHosts = lib.mkOption {
                  type = lib.types.attrsOf (lib.types.submodule {
                    options = {
                      enable = lib.mkEnableOption "published host via Caddy";
                      host = lib.mkOption {
                        type = lib.types.nullOr nixosTypes.fqdn;
                        default = null;
                        description = "Fully-qualified domain name published for this host.";
                      };
                      upstream = lib.mkOption {
                        type = lib.types.nullOr nixosTypes.httpUrl;
                        default = null;
                        description = "HTTP upstream reverse-proxied for this published host.";
                      };
                      extraConfig = lib.mkOption {
                        type = lib.types.lines;
                        default = "";
                        description = "Additional per-host Caddy directives appended after reverse_proxy.";
                      };
                    };
                  });
                  default = {};
                  description = "Additional published product or shell hosts reverse-proxied by the ingress baseline.";
                };
              };
            };

            storage = {
              garage = {
                enable = lib.mkEnableOption "Garage foundation object storage";
                package = lib.mkOption {
                  type = lib.types.package;
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
                  description = "Garage log level.";
                };
                metadataDir = lib.mkOption {
                  type = nixosTypes.absoluteRuntimePath;
                  default = "/var/lib/garage/meta";
                  description = "Metadata directory for Garage.";
                };
                dataDir = lib.mkOption {
                  type = nixosTypes.absoluteRuntimePath;
                  default = "/var/lib/garage/data";
                  description = "Data directory for Garage object blocks.";
                };
                replicationFactor = lib.mkOption {
                  type = lib.types.ints.positive;
                  default = 1;
                  description = "Garage replication_factor.";
                };
                consistencyMode = lib.mkOption {
                  type = lib.types.enum [
                    "consistent"
                    "degraded"
                  ];
                  default = "consistent";
                  description = "Garage consistency_mode.";
                };
                rpcBindAddress = lib.mkOption {
                  type = lib.types.strMatching "^.+:[0-9]+$";
                  default = "127.0.0.1:3901";
                  description = "Garage RPC bind address.";
                };
                rpcPublicAddress = lib.mkOption {
                  type = lib.types.strMatching "^.+:[0-9]+$";
                  default = "127.0.0.1:3901";
                  description = "Garage RPC public address advertised to peers.";
                };
                rpcSecretFile = lib.mkOption {
                  type = nixosTypes.absoluteRuntimePath;
                  default = "/run/secrets/garage-rpc-secret";
                  description = "Runtime file containing the Garage RPC secret.";
                };
                s3ApiBindAddress = lib.mkOption {
                  type = lib.types.strMatching "^.+:[0-9]+$";
                  default = "127.0.0.1:3900";
                  description = "Bind address for the Garage S3 API.";
                };
                s3Region = lib.mkOption {
                  type = lib.types.strMatching "^[A-Za-z0-9._-]+$";
                  default = "garage";
                  description = "Garage S3 region name.";
                };
                s3RootDomain = lib.mkOption {
                  type = lib.types.nullOr (lib.types.strMatching "^\\..+$");
                  default = null;
                  description = "Optional root_domain for virtual-hosted S3 access.";
                };
                webBindAddress = lib.mkOption {
                  type = lib.types.nullOr (lib.types.strMatching "^.+:[0-9]+$");
                  default = null;
                  description = "Optional bind address for Garage website hosting.";
                };
                webRootDomain = lib.mkOption {
                  type = lib.types.nullOr (lib.types.strMatching "^\\..+$");
                  default = null;
                  description = "Optional root_domain for Garage website hosting.";
                };
                adminBindAddress = lib.mkOption {
                  type = lib.types.nullOr (lib.types.strMatching "^.+:[0-9]+$");
                  default = null;
                  description = "Optional bind address for the Garage admin API.";
                };
                adminTokenFile = lib.mkOption {
                  type = lib.types.nullOr nixosTypes.absoluteRuntimePath;
                  default = null;
                  description = "Optional runtime file containing the Garage admin token.";
                };
                metricsTokenFile = lib.mkOption {
                  type = lib.types.nullOr nixosTypes.absoluteRuntimePath;
                  default = null;
                  description = "Optional runtime file containing the Garage metrics token.";
                };
                extraEnvironment = lib.mkOption {
                  type = lib.types.attrsOf lib.types.str;
                  default = {};
                  description = "Extra environment variables passed to the Garage service.";
                };
                extraSettings = lib.mkOption {
                  type = lib.types.attrs;
                  default = {};
                  description = "Additional Garage configuration merged into services.garage.settings.";
                };
              };
            };

            trust = {
              stepCa = {
                enable = lib.mkEnableOption "step-ca private CA baseline";
                address = lib.mkOption {
                  type = lib.types.str;
                  default = "0.0.0.0";
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
                  description = "Optional evaluated JSON config for step-ca.";
                };
                runtimeConfigFile = lib.mkOption {
                  type = lib.types.nullOr nixosTypes.absoluteRuntimePath;
                  default = null;
                  description = "Runtime JSON config path used by the step-ca systemd unit.";
                };
                intermediatePasswordFile = lib.mkOption {
                  type = lib.types.nullOr nixosTypes.absoluteRuntimePath;
                  default = "/var/lib/step-ca/secrets/intermediate_password";
                  description = "Password file used for the intermediate CA key.";
                };
                rootCaCertificate = lib.mkOption {
                  type = lib.types.nullOr lib.types.path;
                  default = null;
                  description = "Root CA certificate added to the local system trust store.";
                };
                publicRootDir = lib.mkOption {
                  type = nixosTypes.absoluteRuntimePath;
                  default = "/var/lib/step-ca/public";
                  description = "Directory that exposes root CA material for bootstrap download.";
                };
              };
            };

            secrets = {
              files = {
                enable = lib.mkEnableOption "file-based runtime secrets baseline";
                runtimeDir = lib.mkOption {
                  type = nixosTypes.absoluteRuntimePath;
                  default = "/run/secrets";
                  description = "Directory used for runtime secret materialization.";
                };
                readerUsers = lib.mkOption {
                  type = lib.types.listOf nixosTypes.unixPrincipalName;
                  default = [];
                  description = "Users that should get read or execute access to the runtime secrets directory.";
                };
                readerGroups = lib.mkOption {
                  type = lib.types.listOf nixosTypes.unixPrincipalName;
                  default = [];
                  description = "Groups that should get read or execute access to the runtime secrets directory.";
                };
              };

              sops = {
                enable = lib.mkEnableOption "sops-nix bootstrap baseline";
                defaultSopsFile = lib.mkOption {
                  type = lib.types.nullOr lib.types.path;
                  default = null;
                  description = "Default SOPS file for this host or deployment.";
                };
                sshKeyPaths = lib.mkOption {
                  type = lib.types.listOf nixosTypes.absoluteRuntimePath;
                  default = ["/etc/ssh/ssh_host_ed25519_key"];
                  description = "SSH key paths used by age for decryption.";
                };
                files = lib.mkOption {
                  type = lib.types.attrsOf (lib.types.submodule ({name, ...}: {
                    options = {
                      key = lib.mkOption {
                        type = nixosTypes.sopsKeyName;
                        default = name;
                        description = "Key inside the SOPS document.";
                      };
                      path = lib.mkOption {
                        type = nixosTypes.absoluteRuntimePath;
                        description = "Runtime path used to materialize this secret file.";
                      };
                      owner = lib.mkOption {
                        type = nixosTypes.userOrGroupRef;
                        default = "root";
                        description = "Owner of the materialized file.";
                      };
                      group = lib.mkOption {
                        type = nixosTypes.userOrGroupRef;
                        default = "root";
                        description = "Group of the materialized file.";
                      };
                      mode = lib.mkOption {
                        type = nixosTypes.octalModeString;
                        default = "0400";
                        description = "Mode of the materialized file.";
                      };
                      restartUnits = lib.mkOption {
                        type = lib.types.listOf nixosTypes.systemdUnitName;
                        default = [];
                        description = "Units restarted when the secret changes.";
                      };
                    };
                  }));
                  default = {};
                  description = "Secret files materialized by sops-nix under runtime paths.";
                };
              };
            };
          };

          services = {
            atrium = {
              enable = lib.mkEnableOption "Atrium portal";
              port = lib.mkOption {
                type = lib.types.port;
                default = 8080;
                description = "HTTP port exposed by Atrium.";
              };
              clientRootPath = lib.mkOption {
                type = nixosTypes.absoluteRuntimePath;
                default = "/etc/atrium/client-root";
                description = ''
                  Runtime path for the canonical Atrium client root directory consumed by the
                  Rust web host and graph runtime.
                '';
              };
              clientRootSource = lib.mkOption {
                type = lib.types.nullOr lib.types.path;
                default = null;
                description = "Optional source directory for the canonical Atrium client root.";
              };
              widgetsPath = lib.mkOption {
                type = nixosTypes.absoluteRuntimePath;
                default = "/etc/atrium/widgets.yaml";
                description = ''
                  Runtime path for the canonical Atrium widgets payload consumed by the
                  Rust web host and graph runtime.
                '';
              };
              widgetsText = lib.mkOption {
                type = lib.types.lines;
                default = "";
                description = "Inline widgets payload rendered for Atrium.";
              };
              widgetsFile = lib.mkOption {
                type = lib.types.nullOr lib.types.path;
                default = null;
                description = "Optional source file for the canonical Atrium widgets payload.";
              };
            };
          };
        };
      };

      eval = lib.evalModules {modules = [docsModule];};
      repoPrefix = "${toString self}/";
      transformDeclaration = decl: let
        declStr = toString decl;
      in
        if lib.hasPrefix repoPrefix declStr
        then lib.removePrefix repoPrefix declStr
        else decl;
    in
      pkgs.nixosOptionsDoc {
        inherit (eval) options;
        transformOptions = opt:
          opt
          // {
            declarations = map transformDeclaration opt.declarations;
          };
      };

    mkApp = description: program: {
      type = "app";
      meta.description = description;
      inherit program;
    };

    mkGovernanceLint = pkgs:
      pkgs.writeShellApplication {
        name = "void-core-governance-lint";
        runtimeInputs = with pkgs; [
          coreutils
          findutils
          gnugrep
          ripgrep
        ];
        text = ''
          set -euo pipefail

          repo_root="''${1:-${self}}"
          cd "$repo_root"

          failures=0

          while IFS= read -r file; do
            if rg -q 'mkEnableOption' "$file" && ! rg -q 'assertions\s*=' "$file"; then
              echo "governance: enable-module-without-assertions: $file" >&2
              failures=1
            fi

            if rg -q 'options\.services\.' "$file" && ! rg -q 'governance-rationale:' "$file"; then
              echo "governance: non-void-namespace-without-rationale: $file" >&2
              failures=1
            fi
          done < <(find platform/nixos/modules -type f -name '*.nix' | sort)

          while IFS= read -r file; do
            if rg -q 'mkOption' "$file" && ! rg -q 'example\s*=' "$file"; then
              echo "advisory: option-file-without-examples: $file" >&2
            fi
          done < <(find platform/nixos/modules -type f -name '*.nix' | sort)

          while IFS=: read -r file line _rest; do
            start_line=$((line > 2 ? line - 2 : 1))
            prev_line=$((line - 1))
            if sed -n "''${start_line},''${prev_line}p" "$file" | rg -q 'governance-open-contract:'; then
              echo "note: open string contract accepted: ''${file}:''${line}" >&2
            else
              echo "advisory: wide string contract without rationale: ''${file}:''${line}" >&2
              failures=1
            fi
          done < <(rg -n 'type\s*=\s*lib\.types\.str;' platform/nixos/modules)

          exit "$failures"
        '';
      };

    mkLintApp = pkgs: let
      governanceLint = mkGovernanceLint pkgs;
    in
      pkgs.writeShellApplication {
        name = "void-core-lint";
        runtimeInputs = [
          pkgs.alejandra
          pkgs.deadnix
          pkgs.statix
          governanceLint
        ];
        text = ''
          set -euo pipefail

          repo_root="''${1:-${self}}"
          cd "$repo_root"

          alejandra --check .
          statix check .
          deadnix .
          void-core-governance-lint .
        '';
      };

    mkCommandCheck = pkgs: name: inputs: command:
      pkgs.runCommand name {nativeBuildInputs = inputs;} ''
        cd ${self}
        ${command}
        touch $out
      '';
  in {
    lib = {
      inherit nixosTypes;
    };

    nixosModules = {
      naming = import ./platform/nixos/modules/naming;
      data = import ./platform/nixos/modules/data;
      auth = import ./platform/nixos/modules/auth;
      dns = import ./platform/nixos/modules/dns;
      ingress = import ./platform/nixos/modules/ingress;
      pki = import ./platform/nixos/modules/pki;
      shell = import ./platform/nixos/modules/shell;
      storage = import ./platform/nixos/modules/storage;
      status = import ./platform/nixos/modules/status;
      secrets-files = import ./platform/nixos/modules/secrets/files.nix;
      sops-baseline = import ./platform/nixos/modules/secrets/sops-baseline.nix;
      reference-default-minimal = import ./platform/nixos/profiles/reference/default-minimal;
      foundation = foundationModule;
    };

    formatter = forAllSystems (pkgs: pkgs.alejandra);

    packages = forAllSystems (pkgs: let
      atrium = import ./platform/packages/atrium {inherit pkgs;};
    in {
      governance-lint = mkGovernanceLint pkgs;
      lint = mkLintApp pkgs;
      foundation-options-doc = (mkFoundationOptionsDoc pkgs).optionsCommonMark;
      atrium-source = atrium.source;
      atrium-frontend-dist = atrium.frontendDist;
      atrium = atrium.frontendDist;
    });

    apps = forAllSystems (pkgs: {
      governance-lint = mkApp "Run the void-core governance linter" "${mkGovernanceLint pkgs}/bin/void-core-governance-lint";
      lint = mkApp "Run the void-core lint suite" "${mkLintApp pkgs}/bin/void-core-lint";
    });

    checks = forAllSystems (pkgs: {
      alejandra = mkCommandCheck pkgs "alejandra-check" [pkgs.alejandra] "alejandra --check .";
      deadnix = mkCommandCheck pkgs "deadnix-check" [pkgs.deadnix] "deadnix .";
      statix = mkCommandCheck pkgs "statix-check" [pkgs.statix] "statix check .";
      foundation-options-doc = (mkFoundationOptionsDoc pkgs).optionsCommonMark;
      governance = pkgs.runCommand "governance-check" {} ''
        cd ${self}
        ${mkGovernanceLint pkgs}/bin/void-core-governance-lint .
        touch $out
      '';
    });

    devShells = forAllSystems (pkgs: {
      default = pkgs.mkShell {
        packages = [
          pkgs.alejandra
          pkgs.deadnix
          pkgs.statix
          (mkGovernanceLint pkgs)
          (mkLintApp pkgs)
        ];
      };
    });
  };
}
