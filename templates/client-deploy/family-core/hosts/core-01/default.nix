{...}: {
  imports = [
    ./hardware-configuration.nix
    ../../profiles/family-core/default.nix
  ];

  networking.hostName = "core-01";

  system.stateVersion = "25.11";
}
