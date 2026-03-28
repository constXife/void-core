{lib}: rec {
  absolutePath = lib.types.strMatching "^/.*$";

  absoluteRuntimePath = absolutePath;

  emailAddress = lib.types.strMatching "^[^[:space:]@]+@[^[:space:]@]+$";

  octalModeString = lib.types.strMatching "^[0-7]{4}$";

  envVarName = lib.types.strMatching "^[A-Z_][A-Z0-9_]*$";

  placeholderToken = lib.types.strMatching "^__[A-Z0-9_]+__$";

  dnsLabel = lib.types.strMatching "^[a-z0-9]([a-z0-9-]*[a-z0-9])?$";

  fqdn = lib.types.strMatching "^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$";

  cidr = lib.types.strMatching "^[0-9A-Fa-f:.]+/[0-9]{1,3}$";

  httpUrl = lib.types.strMatching "^https?://.+$";

  unixPrincipalName = lib.types.strMatching "^[a-z_][a-z0-9_-]*[$]?$";

  userOrGroupRef = lib.types.strMatching "^([0-9]+|[a-z_][a-z0-9_-]*[$]?)$";

  sopsKeyName = lib.types.strMatching "^[A-Za-z0-9._/-]+$";

  systemdUnitName = lib.types.strMatching "^[A-Za-z0-9_.@-]+\\.(service|socket|target|path|timer|mount|automount|slice|scope|swap)$";
}
