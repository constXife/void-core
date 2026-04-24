{
  pkgs,
  frontendDist,
  hostPackage,
  hostBinary ? "void-atrium-web",
  hostModeDefault ? null,
}: let
  hostModeArgs =
    if hostModeDefault == null
    then ""
    else "--set-default ATRIUM_HOST_MODE ${pkgs.lib.escapeShellArg hostModeDefault} \\\n    ";
in
  pkgs.runCommand "atrium-server" {
    nativeBuildInputs = [pkgs.makeWrapper];
    meta = {
      description = "Atrium foundation server wrapper with embedded frontend dist";
      mainProgram = "atrium";
    };
  } ''
    mkdir -p "$out/bin" "$out/share/atrium/dist"
    cp -R ${frontendDist}/. "$out/share/atrium/dist"

    makeWrapper "${hostPackage}/bin/${hostBinary}" "$out/bin/void-atrium-web" \
      ${hostModeArgs}--set-default VOID_ATRIUM_WEB_DIST_DIR "$out/share/atrium/dist"
    ln -s "$out/bin/void-atrium-web" "$out/bin/atrium"
  ''
