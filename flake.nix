{
  description = "Public foundation repository for reusable self-hosted building blocks";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-25.11";

    sops-nix.url = "github:Mic92/sops-nix";
    sops-nix.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs = { self, sops-nix, ... }: {
    nixosModules = {
      naming = import ./platform/nixos/modules/naming;
      auth = import ./platform/nixos/modules/auth;
      dns = import ./platform/nixos/modules/dns;
      ingress = import ./platform/nixos/modules/ingress;
      pki = import ./platform/nixos/modules/pki;
      shell = import ./platform/nixos/modules/shell;
      status = import ./platform/nixos/modules/status;
      secrets-files = import ./platform/nixos/modules/secrets/files.nix;
      sops-baseline = import ./platform/nixos/modules/secrets/sops-baseline.nix;
      foundation = {
        imports = [
          sops-nix.nixosModules.sops
          ./platform/nixos/modules/naming
          ./platform/nixos/modules/auth
          ./platform/nixos/modules/dns
          ./platform/nixos/modules/ingress
          ./platform/nixos/modules/pki
          ./platform/nixos/modules/shell
          ./platform/nixos/modules/status
          ./platform/nixos/modules/secrets/files.nix
          ./platform/nixos/modules/secrets/sops-baseline.nix
        ];
      };
    };

    nixosProfiles = {
      reference = {
        family-core-minimal =
          import ./platform/nixos/profiles/reference/family-core-minimal;
      };
    };
  };
}
