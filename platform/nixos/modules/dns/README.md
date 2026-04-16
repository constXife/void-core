# DNS Modules

This directory contains foundation-level DNS modules.

The first scaffolded DNS module is:
- `coredns.nix` — a minimal private-zone resolver baseline for client-owned deployments.

It intentionally stops at:
- authoritative private-zone serving;
- optional upstream forwarding;
- local firewall exposure.

It does not attempt to own:
- router automation;
- DHCP integration;
- external DNS providers;
- client-specific zone contents.
