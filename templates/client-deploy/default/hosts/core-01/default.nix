{...}: {
  imports = [
    ./hardware-configuration.nix
    ../../profiles/default/default.nix
  ];

  networking.hostName = "core-01";

  system.stateVersion = "25.11";
}
