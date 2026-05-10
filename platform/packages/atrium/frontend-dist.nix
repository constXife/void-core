{
  pkgs,
  src,
}: let
  frontendSrc = src + "/frontend";
  nodeModules = pkgs.stdenvNoCC.mkDerivation {
    pname = "atrium-frontend-node-modules";
    version = "0.1.0";
    src = frontendSrc;
    nativeBuildInputs = [pkgs.bun];

    dontConfigure = true;
    dontBuild = true;
    dontFixup = true;

    installPhase = ''
      runHook preInstall
      export HOME=$NIX_BUILD_TOP
      bun install --frozen-lockfile --no-progress
      mkdir -p $out
      cp -R node_modules $out/node_modules
      runHook postInstall
    '';

    outputHashAlgo = "sha256";
    outputHashMode = "recursive";
    outputHash =
      {
        "aarch64-darwin" = "sha256-uLylSrm+E8c5fqiV/HGeDLNXRj9iMoMUEBqKr9Oshus=";
        "x86_64-linux" = "sha256-2q9AxLQrlQUZfvZwxt5LR8gKJzgKAoFd1UddOff8GRU=";
      }
      .${
        pkgs.stdenv.hostPlatform.system
      }
      or pkgs.lib.fakeHash;
  };
in
  pkgs.stdenvNoCC.mkDerivation {
    pname = "atrium-frontend-dist";
    version = "0.1.0";
    src = frontendSrc;
    nativeBuildInputs = [pkgs.bun pkgs.nodejs];

    dontConfigure = true;
    dontFixup = true;

    buildPhase = ''
      runHook preBuild
      cp -R ${nodeModules}/node_modules ./node_modules
      chmod -R u+w node_modules
      patchShebangs node_modules/.bin
      bun run build
      runHook postBuild
    '';

    installPhase = ''
      runHook preInstall
      mkdir -p "$out"
      cp -R dist/. "$out"/
      runHook postInstall
    '';
  }
