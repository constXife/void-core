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
  mkServiceOptions = {
    defaultSubdomain,
    subdomainDescription,
    fqdnDescription,
  }: {
    subdomain = lib.mkOption {
      type = lib.types.nullOr types.dnsLabel;
      default = defaultSubdomain;
      example = defaultSubdomain;
      description = subdomainDescription;
    };

    fqdn = lib.mkOption {
      type = lib.types.nullOr types.fqdn;
      readOnly = true;
      description = fqdnDescription;
    };
  };
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
      atrium = mkServiceOptions {
        defaultSubdomain = "atrium";
        subdomainDescription = "Subdomain used for the Atrium shell endpoint.";
        fqdnDescription = "Fully-qualified domain name for the Atrium shell endpoint.";
      };

      api = mkServiceOptions {
        defaultSubdomain = "api";
        subdomainDescription = "Subdomain used for the canonical product API endpoint.";
        fqdnDescription = "Fully-qualified domain name for the canonical product API endpoint.";
      };

      mcp = mkServiceOptions {
        defaultSubdomain = "mcp";
        subdomainDescription = "Subdomain used for the MCP and tooling endpoint.";
        fqdnDescription = "Fully-qualified domain name for the MCP and tooling endpoint.";
      };

      calendar = mkServiceOptions {
        defaultSubdomain = "calendar";
        subdomainDescription = "Subdomain used for the calendar-facing product host.";
        fqdnDescription = "Fully-qualified domain name for the calendar-facing product host.";
      };

      inventory = mkServiceOptions {
        defaultSubdomain = "inventory";
        subdomainDescription = "Subdomain used for the inventory-facing product host.";
        fqdnDescription = "Fully-qualified domain name for the inventory-facing product host.";
      };

      finance = mkServiceOptions {
        defaultSubdomain = "finance";
        subdomainDescription = "Subdomain used for the finance-facing product host.";
        fqdnDescription = "Fully-qualified domain name for the finance-facing product host.";
      };

      id = mkServiceOptions {
        defaultSubdomain = "id";
        subdomainDescription = "Subdomain used for the identity endpoint.";
        fqdnDescription = "Fully-qualified domain name for the identity endpoint.";
      };

      ca = mkServiceOptions {
        defaultSubdomain = "ca";
        subdomainDescription = "Subdomain used for the private CA endpoint.";
        fqdnDescription = "Fully-qualified domain name for the private CA endpoint.";
      };

      s3 = mkServiceOptions {
        defaultSubdomain = "s3";
        subdomainDescription = "Subdomain used for the object-storage endpoint.";
        fqdnDescription = "Fully-qualified domain name for the object-storage endpoint.";
      };
    };
  };

  config = {
    void.services = {
      atrium.fqdn = mkFqdn config.void.services.atrium.subdomain;
      api.fqdn = mkFqdn config.void.services.api.subdomain;
      mcp.fqdn = mkFqdn config.void.services.mcp.subdomain;
      calendar.fqdn = mkFqdn config.void.services.calendar.subdomain;
      inventory.fqdn = mkFqdn config.void.services.inventory.subdomain;
      finance.fqdn = mkFqdn config.void.services.finance.subdomain;
      id.fqdn = mkFqdn config.void.services.id.subdomain;
      ca.fqdn = mkFqdn config.void.services.ca.subdomain;
      s3.fqdn = mkFqdn config.void.services.s3.subdomain;
    };
  };
}
