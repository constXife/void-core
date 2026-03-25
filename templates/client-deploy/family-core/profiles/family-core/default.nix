{ inputs, lib, ... }: {
  imports = [
    inputs.void-core.nixosProfiles.reference.family-core-minimal
    ../../inventory/hosts.nix
    ../../overlays/local-policy.nix
  ];

  void.site.domain = lib.mkDefault "site.home.arpa";
  void.network.dns.mode = lib.mkDefault "local-resolver";
  void.network.tls.mode = lib.mkDefault "private-ca";

  virtualisation.podman.enable = true;

  void.secrets.sops.enable = true;
  void.secrets.sops.defaultSopsFile = ../../secrets/core-01.yaml;
  void.secrets.sops.files."rauthy-env" = {
    key = "rauthy.env";
    path = "/run/secrets/rauthy.env";
    mode = "0400";
    restartUnits = [ "podman-rauthy.service" ];
  };

  void.auth.rauthy.enable = true;
  void.auth.rauthy.configTemplate =
    inputs.void-core + "/examples/family-core/rauthy.toml.template";

  # Enable these once the client repo contains a real zone file, root CA
  # certificate, and step-ca runtime config materialized from SOPS.
  #
  # void.dns.coredns.enable = true;
  # void.dns.coredns.zoneFile = ../../dns/site.zone;
  # void.dns.coredns.allowCidrs = [ "127.0.0.0/8" "192.168.0.0/16" ];
  # void.dns.coredns.upstreamResolvers = [ "1.1.1.1" "1.0.0.1" ];
  #
  # void.secrets.sops.files."step-ca-json" = {
  #   key = "step-ca.json";
  #   path = "/run/secrets/step-ca.json";
  #   mode = "0400";
  #   restartUnits = [ "step-ca.service" ];
  # };
  #
  # void.trust.stepCa.enable = true;
  # void.trust.stepCa.rootCaCertificate = ../../ca/root-ca.crt;
  #
  # void.ingress.caddy.enable = true;
}
