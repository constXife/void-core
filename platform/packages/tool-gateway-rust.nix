{pkgs}:
pkgs.stdenv.mkDerivation {
  pname = "void-tool-gateway";
  version = "0.1.0";
  src = ../tool-gateway/rust;
  nativeBuildInputs = [pkgs.rustc];
  dontConfigure = true;
  buildPhase = ''
    runHook preBuild
    mkdir -p target
    rustc --edition=2021 --crate-type=lib src/lib.rs -o target/libvoid_tool_gateway.rlib
    rustc --edition=2021 --test src/lib.rs -o target/void-tool-gateway-tests
    ./target/void-tool-gateway-tests
    runHook postBuild
  '';
  installPhase = ''
    runHook preInstall
    mkdir -p "$out/lib" "$out/share/void-tool-gateway"
    cp target/libvoid_tool_gateway.rlib "$out/lib/"
    cp -R src Cargo.toml "$out/share/void-tool-gateway/"
    runHook postInstall
  '';
  meta = {
    description = "Foundation ToolGateway and confirm-token Rust contract";
  };
}
