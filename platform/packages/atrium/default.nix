{pkgs ? import <nixpkgs> {}}: let
  sourceTree = import ./source.nix {inherit (pkgs) lib;};
  source = pkgs.linkFarm "atrium-source" [
    {
      name = "app";
      path = sourceTree;
    }
  ];
  frontendDist = pkgs.callPackage ./frontend-dist.nix {src = sourceTree;};
  server = pkgs.callPackage ./server.nix {
    src = sourceTree;
    inherit frontendDist;
  };
in {
  inherit source frontendDist server;
  default = server;
}
