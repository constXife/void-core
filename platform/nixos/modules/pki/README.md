# PKI Modules

This directory contains foundation-level PKI modules.

The first scaffolded PKI module is:
- `step-ca.nix` — a narrow private CA baseline with runtime-config and trust-store hooks.

It is intentionally limited to:
- self-hosted private certificate issuance;
- runtime JSON configuration delivery;
- root certificate installation on the local system.

It does not own:
- client trust distribution to every device;
- HSM policy;
- external public CA integrations;
- router or browser management.
