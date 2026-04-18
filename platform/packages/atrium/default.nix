{pkgs ? import <nixpkgs> {}}: let
  sourceTree = import ./source.nix {inherit (pkgs) lib;};
  source = pkgs.linkFarm "atrium-source" [
    {
      name = "app";
      path = sourceTree;
    }
  ];
  frontendDist = pkgs.callPackage ./frontend-dist.nix {src = sourceTree;};
in {
  inherit source frontendDist;
  default = frontendDist;
}
