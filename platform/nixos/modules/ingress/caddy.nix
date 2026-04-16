{
  config,
  lib,
  pkgs,
  ...
}: let
  types = import ../../lib/types.nix {inherit lib;};
  cfg = config.void.ingress.caddy;
  idHost = config.void.services.id.fqdn;
  caHost = config.void.services.ca.fqdn;
  publishedHosts = lib.filterAttrs (_: hostCfg: hostCfg.enable && hostCfg.host != null) cfg.publishedHosts;
  tlsSnippet = ''
    tls {
      issuer acme {
        disable_http_challenge
      }
    }
  '';
in {
  options.void.ingress.caddy = {
    enable = lib.mkEnableOption "Caddy ingress baseline";

    package = lib.mkOption {
      type = lib.types.package;
      default = pkgs.caddy;
      description = "Caddy package used for the ingress baseline.";
    };

    acmeCA = lib.mkOption {
      type = lib.types.nullOr types.httpUrl;
      default =
        if config.void.network.tls.mode == "private-ca" && config.void.trust.stepCa.enable && caHost != null
        then "https://${caHost}:${toString config.void.trust.stepCa.port}/acme/acme/directory"
        else null;
      example = "https://ca.family.home.arpa:9000/acme/acme/directory";
      description = "Custom ACME directory URL used by Caddy.";
    };

    globalConfig = lib.mkOption {
      type = lib.types.lines;
      default = ''
        auto_https disable_redirects
      '';
      description = "Extra global Caddyfile configuration.";
    };

    exposeIdentity = lib.mkOption {
      type = lib.types.bool;
      default = idHost != null;
      description = "Whether to publish the identity endpoint via Caddy.";
    };

    idUpstream = lib.mkOption {
      type = types.httpUrl;
      default = "http://127.0.0.1:8080";
      example = "http://127.0.0.1:8080";
      description = "Upstream for the identity endpoint.";
    };

    exposeCa = lib.mkOption {
      type = lib.types.bool;
      default = config.void.trust.stepCa.enable && caHost != null;
      description = "Whether to publish the private CA endpoint via Caddy.";
    };

    caUpstream = lib.mkOption {
      type = types.httpUrl;
      default = "https://127.0.0.1:${toString config.void.trust.stepCa.port}";
      example = "https://127.0.0.1:9000";
      description = "Upstream for the private CA endpoint.";
    };

    caPublicRoot = lib.mkOption {
      type = types.absoluteRuntimePath;
      default = config.void.trust.stepCa.publicRootDir;
      example = "/var/lib/step-ca/public";
      description = "Directory used to serve public CA bootstrap material over HTTP.";
    };

    publishedHosts = lib.mkOption {
      type = lib.types.attrsOf (lib.types.submodule ({name, ...}: {
        options = {
          enable = lib.mkEnableOption "published host ${name} via Caddy";

          host = lib.mkOption {
            type = lib.types.nullOr types.fqdn;
            default = null;
            description = "Fully-qualified domain name published for this host.";
          };

          upstream = lib.mkOption {
            type = lib.types.nullOr types.httpUrl;
            default = null;
            description = "HTTP upstream reverse-proxied for this published host.";
          };

          extraConfig = lib.mkOption {
            type = lib.types.lines;
            default = "";
            description = "Additional per-host Caddy directives appended after reverse_proxy.";
          };
        };
      }));
      default = {};
      description = "Additional published product or shell hosts reverse-proxied by the ingress baseline.";
    };
  };

  config = lib.mkIf cfg.enable {
    assertions =
      [
        {
          assertion = config.void.network.tls.mode != "external";
          message = "void.ingress.caddy does not manage external TLS termination; use void.network.tls.mode = private-ca or acme.";
        }
        {
          assertion = config.void.network.tls.mode != "private-ca" || config.void.trust.stepCa.enable;
          message = "void.ingress.caddy requires void.trust.stepCa.enable = true when private-ca mode is enabled.";
        }
        {
          assertion = config.void.network.tls.mode != "private-ca" || cfg.acmeCA != null;
          message = "void.ingress.caddy requires void.ingress.caddy.acmeCA when private-ca mode is enabled.";
        }
      ]
      ++ lib.mapAttrsToList (name: hostCfg: {
        assertion = hostCfg.upstream != null;
        message = "void.ingress.caddy.publishedHosts.${name}.enable requires a non-null upstream.";
      })
      publishedHosts;

    services.caddy =
      {
        enable = true;
        inherit (cfg) package globalConfig;
        logFormat = "";

        virtualHosts =
          {
            ":80" = {
              extraConfig = ''
                ${lib.optionalString (cfg.exposeCa && caHost != null) ''
                  @ca host ${caHost}
                  handle @ca {
                    root * ${cfg.caPublicRoot}
                    file_server
                  }
                ''}
                handle {
                  redir https://{host}{uri} 308
                }
              '';
              logFormat = null;
            };
          }
          // lib.optionalAttrs (cfg.exposeIdentity && idHost != null) {
            "${idHost}" = {
              extraConfig = ''
                ${tlsSnippet}
                reverse_proxy ${cfg.idUpstream}
              '';
              logFormat = null;
            };
          }
          // lib.optionalAttrs (cfg.exposeCa && caHost != null) {
            "${caHost}" = {
              extraConfig = ''
                ${tlsSnippet}
                @bootstrap path / /index.html /root_ca.crt /root_ca.der /root_ca.sha256
                handle @bootstrap {
                  root * ${cfg.caPublicRoot}
                  file_server
                }
                handle {
                  reverse_proxy ${cfg.caUpstream} {
                    transport http {
                      tls_insecure_skip_verify
                    }
                  }
                }
              '';
              logFormat = null;
            };
          }
          // lib.mapAttrs' (
            _: hostCfg:
              lib.nameValuePair hostCfg.host {
                extraConfig = ''
                  ${tlsSnippet}
                  reverse_proxy ${hostCfg.upstream}
                  ${hostCfg.extraConfig}
                '';
                logFormat = null;
              }
          )
          publishedHosts;
      }
      // lib.optionalAttrs (cfg.acmeCA != null) {
        inherit (cfg) acmeCA;
      };

    systemd.services.caddy.after = lib.optionals config.void.trust.stepCa.enable [
      "step-ca.service"
    ];

    networking.firewall.allowedTCPPorts = [80 443];
  };
}
