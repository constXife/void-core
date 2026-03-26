{
  config,
  lib,
  ...
}: let
  types = import ../../lib/types.nix {inherit lib;};
  mkFqdn = subdomain:
    if subdomain == null
    then null
    else "${subdomain}.${config.void.site.domain}";
in {
  options.void = {
    site.domain = lib.mkOption {
      type = types.fqdn;
      default = "site.home.arpa";
      example = "family.home.arpa";
      description = "Canonical site domain for this deployment.";
    };

    network.dns.mode = lib.mkOption {
      type = lib.types.enum [
        "hosts"
        "local-resolver"
        "external"
      ];
      default = "local-resolver";
      description = "How client devices resolve private service names.";
    };

    network.tls.mode = lib.mkOption {
      type = lib.types.enum [
        "private-ca"
        "acme"
        "external"
      ];
      default = "private-ca";
      description = "How TLS certificates are obtained for private endpoints.";
    };

    services = {
      id.subdomain = lib.mkOption {
        type = lib.types.nullOr types.dnsLabel;
        default = "id";
        example = "id";
        description = "Subdomain used for the identity endpoint.";
      };

      id.fqdn = lib.mkOption {
        type = lib.types.nullOr types.fqdn;
        readOnly = true;
        description = "Fully-qualified domain name for the identity endpoint.";
      };

      ca.subdomain = lib.mkOption {
        type = lib.types.nullOr types.dnsLabel;
        default = "ca";
        example = "ca";
        description = "Subdomain used for the private CA endpoint.";
      };

      ca.fqdn = lib.mkOption {
        type = lib.types.nullOr types.fqdn;
        readOnly = true;
        description = "Fully-qualified domain name for the private CA endpoint.";
      };
    };
  };

  config = {
    void.services.id.fqdn = mkFqdn config.void.services.id.subdomain;
    void.services.ca.fqdn = mkFqdn config.void.services.ca.subdomain;
  };
}
