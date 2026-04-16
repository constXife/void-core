{
  config,
  lib,
  pkgs,
  ...
}: let
  types = import ../../lib/types.nix {inherit lib;};
  cfg = config.void.dns.coredns;
  zoneFilename = "${cfg.zoneName}.zone";
  allowRules = lib.concatStringsSep "\n" (map (cidr: "          allow net ${cidr}") cfg.allowCidrs);
  forwardBlock = lib.optionalString (cfg.upstreamResolvers != []) ''

    .:53 {
      import allowed_clients
      forward . ${lib.concatStringsSep " " cfg.upstreamResolvers}
      log
      errors
    }
  '';
in {
  options.void.dns.coredns = {
    enable = lib.mkEnableOption "CoreDNS foundation baseline";

    zoneName = lib.mkOption {
      type = types.fqdn;
      default = config.void.site.domain;
      example = "family.home.arpa";
      description = "Authoritative zone served by CoreDNS.";
    };

    zoneFile = lib.mkOption {
      type = lib.types.nullOr lib.types.path;
      default = null;
      example = ./site.zone;
      description = "Zone file used for the authoritative private zone.";
    };

    allowCidrs = lib.mkOption {
      type = lib.types.listOf types.cidr;
      default = [
        "127.0.0.0/8"
      ];
      example = [
        "127.0.0.0/8"
        "192.168.0.0/16"
      ];
      description = "CIDRs allowed to query the resolver.";
    };

    upstreamResolvers = lib.mkOption {
      # governance-open-contract: resolver targets deliberately allow hostnames or IP literals.
      type = lib.types.listOf lib.types.str;
      default = [];
      example = [
        "1.1.1.1"
        "1.0.0.1"
      ];
      description = "Upstream resolvers used for non-authoritative queries.";
    };
  };

  config = lib.mkIf cfg.enable {
    assertions = [
      {
        assertion = cfg.zoneFile != null;
        message = "void.dns.coredns.zoneFile must be set when CoreDNS is enabled.";
      }
    ];

    services.coredns = {
      enable = true;
      config = ''
                (allowed_clients) {
                  acl {
        ${allowRules}
                    block
                  }
                }

                ${cfg.zoneName}:53 {
                  import allowed_clients
                  file /etc/coredns/${zoneFilename}
                  log
                  errors
                }${forwardBlock}
      '';
    };

    environment.etc."coredns/${zoneFilename}".source = cfg.zoneFile;

    systemd.services.coredns-reload = {
      description = "Reload CoreDNS";
      serviceConfig = {
        Type = "oneshot";
        ExecStart = "${pkgs.systemd}/bin/systemctl reload coredns.service";
      };
    };

    systemd.paths.coredns-zone = {
      pathConfig = {
        PathChanged = ["/etc/coredns/${zoneFilename}"];
        PathModified = ["/etc/coredns/${zoneFilename}"];
        Unit = "coredns-reload.service";
      };
      wantedBy = ["multi-user.target"];
    };

    networking.firewall.allowedTCPPorts = [53];
    networking.firewall.allowedUDPPorts = [53];
  };
}
