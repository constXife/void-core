{
  pkgs,
  src,
  frontendDist,
}:
let
  preparedSrc = pkgs.runCommand "atrium-server-src" {} ''
    cp -R ${src}/. "$out"
    chmod -R u+w "$out"
    rm -rf "$out/backend/internal/web/dist"
    mkdir -p "$out/backend/internal/web/dist"
    cp -R ${frontendDist}/. "$out/backend/internal/web/dist/"
  '';
in
pkgs.buildGoModule {
  pname = "atrium-server";
  version = "0.1.0";
  src = preparedSrc;
  modRoot = "backend";
  subPackages = ["./cmd/server"];
  vendorHash = "sha256-PVbFQzRXBccN4YRulcQsEpeX02KJLUAdADoZe8BmjWo=";
  nativeBuildInputs = [pkgs.makeWrapper];
  ldflags = [
    "-s"
    "-w"
  ];
  CGO_ENABLED = 0;

  postInstall = ''
    mkdir -p "$out/share/atrium"
    cp -R ${src}/backend/migrations "$out/share/atrium/migrations"
    if [ -d ${src}/backend/configs ]; then
      cp -R ${src}/backend/configs "$out/share/atrium/configs"
    fi

    wrapProgram "$out/bin/server" \
      --set-default MIGRATIONS_DIR "$out/share/atrium/migrations"
  '';

  meta = {
    description = "Atrium server with embedded frontend assets";
    mainProgram = "server";
  };
}
