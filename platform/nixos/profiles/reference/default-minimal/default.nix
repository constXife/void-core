{...}: {
  imports = [
    ../../../modules/naming
    ../../../modules/data
    ../../../modules/auth
    ../../../modules/dns
    ../../../modules/ingress
    ../../../modules/pki
    ../../../modules/shell
    ../../../modules/storage
    ../../../modules/status
    ../../../modules/secrets/files.nix
    ../../../modules/secrets/sops-baseline.nix
  ];

  void.secrets.files.enable = true;
}
