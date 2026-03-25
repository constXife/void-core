{
  config,
  lib,
  pkgs,
  ...
}: let
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
      type = lib.types.str;
      default = config.void.site.domain;
      description = "Authoritative zone served by CoreDNS.";
    };

    zoneFile = lib.mkOption {
      type = lib.types.nullOr lib.types.path;
      default = null;
      description = "Zone file used for the authoritative private zone.";
    };

    allowCidrs = lib.mkOption {
      type = lib.types.listOf lib.types.str;
      default = [
        "127.0.0.0/8"
      ];
      description = "CIDRs allowed to query the resolver.";
    };

    upstreamResolvers = lib.mkOption {
      type = lib.types.listOf lib.types.str;
      default = [];
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

    networking.firewall.allowedTCPPorts = [ 53 ];
    networking.firewall.allowedUDPPorts = [ 53 ];
  };
}
