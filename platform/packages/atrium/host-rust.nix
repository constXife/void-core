{pkgs}:
pkgs.stdenv.mkDerivation {
  pname = "atrium-host-rust";
  version = "0.1.0";
  src = ../../apps/atrium/host-rust;
  nativeBuildInputs = [pkgs.rustc pkgs.clang];
  dontConfigure = true;
  dontUnpack = false;
  buildPhase = ''
    runHook preBuild
    mkdir -p target
    rustc --edition=2021 src/main.rs -o target/atrium-host-rust
    runHook postBuild
  '';
  installPhase = ''
    runHook preInstall
    mkdir -p "$out/bin"
    cp target/atrium-host-rust "$out/bin/atrium-host-rust"
    runHook postInstall
  '';
  meta = {
    description = "Transitional Atrium host shim owned by void-core";
    mainProgram = "atrium-host-rust";
  };
}
