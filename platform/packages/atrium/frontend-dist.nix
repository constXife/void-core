{
  pkgs,
  src,
}:
pkgs.buildNpmPackage {
  pname = "atrium-frontend-dist";
  version = "0.1.0";
  src = src + "/frontend";
  npmDepsHash = "sha256-BzY20S1Akxr9VsDelvdPgyP49TQ4aW7K1GdlZrF/OXY=";

  npmBuildScript = "build";

  installPhase = ''
    runHook preInstall
    mkdir -p "$out"
    cp -R dist/. "$out"/
    runHook postInstall
  '';
}
