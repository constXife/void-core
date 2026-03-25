{
  config,
  lib,
  ...
}: let
  mkFqdn = subdomain:
    if subdomain == null
    then null
    else "${subdomain}.${config.void.site.domain}";
in {
  options.void = {
    site.domain = lib.mkOption {
      type = lib.types.str;
      default = "site.home.arpa";
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

    services.id.subdomain = lib.mkOption {
      type = lib.types.nullOr lib.types.str;
      default = "id";
      description = "Subdomain used for the identity endpoint.";
    };

    services.id.fqdn = lib.mkOption {
      type = lib.types.nullOr lib.types.str;
      readOnly = true;
      description = "Fully-qualified domain name for the identity endpoint.";
    };

    services.ca.subdomain = lib.mkOption {
      type = lib.types.nullOr lib.types.str;
      default = "ca";
      description = "Subdomain used for the private CA endpoint.";
    };

    services.ca.fqdn = lib.mkOption {
      type = lib.types.nullOr lib.types.str;
      readOnly = true;
      description = "Fully-qualified domain name for the private CA endpoint.";
    };
  };

  config = {
    void.services.id.fqdn = mkFqdn config.void.services.id.subdomain;
    void.services.ca.fqdn = mkFqdn config.void.services.ca.subdomain;
  };
}
