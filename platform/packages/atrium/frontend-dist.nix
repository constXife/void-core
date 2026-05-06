{
  pkgs,
  src,
}:
pkgs.buildNpmPackage {
  pname = "atrium-frontend-dist";
  version = "0.1.0";
  src = src + "/frontend";
  npmDepsHash = "sha256-ZdXtbVzqW7RijGnwQNUETesW0NZ5v1RPJmk8vnChJjo=";

  npmBuildScript = "build";

  installPhase = ''
    runHook preInstall
    mkdir -p "$out"
    cp -R dist/. "$out"/
    runHook postInstall
  '';
}
