{pkgs ? import <nixpkgs> {}}:
pkgs.linkFarm "atrium-source" [
  {
    name = "app";
    path = ../../apps/atrium;
  }
]
