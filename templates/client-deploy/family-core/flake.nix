{
  description = "Client-owned deployment template for family-core";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-25.11";
    void-core.url = "path:../../../";
  };

  outputs = inputs@{ nixpkgs, ... }: {
    nixosConfigurations.core-01 = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      specialArgs = { inherit inputs; };
      modules = [
        inputs.void-core.nixosModules.foundation
        ./hosts/core-01/default.nix
      ];
    };
  };
}
