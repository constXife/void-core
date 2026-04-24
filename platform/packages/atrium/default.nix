{pkgs ? import <nixpkgs> {}}: let
  sourceTree = import ./source.nix {inherit (pkgs) lib;};
  source = pkgs.linkFarm "atrium-source" [
    {
      name = "app";
      path = sourceTree;
    }
  ];
  frontendDist = pkgs.callPackage ./frontend-dist.nix {src = sourceTree;};
  clientRootDefault = pkgs.runCommand "atrium-client-root-default" {} ''
    mkdir -p "$out"
    cp -R ${../../apps/atrium/client-root/default}/. "$out"
  '';
  hostRust = pkgs.callPackage ./host-rust.nix {};
  server = pkgs.callPackage ./server.nix {
    inherit frontendDist;
    hostPackage = hostRust;
    hostBinary = "atrium-host-rust";
    hostModeDefault = "preview";
  };
  widgetsDefault = pkgs.runCommand "atrium-widgets-default" {} ''
    mkdir -p "$out"
    cp ${../../apps/atrium/widgets/default.yaml} "$out/widgets.yaml"
  '';
  run = pkgs.callPackage ./run.nix {inherit hostRust;};
  backendDev = pkgs.callPackage ./backend-dev.nix {inherit run;};
in {
  inherit backendDev clientRootDefault frontendDist hostRust run server source widgetsDefault;
  serverFor = {
    hostPackage,
    hostBinary ? "void-atrium-web",
    hostModeDefault ? null,
  }:
    pkgs.callPackage ./server.nix {
      inherit frontendDist hostBinary hostModeDefault hostPackage;
    };
  default = frontendDist;
}
