# Data Modules

This directory contains foundation-level data substrate modules.

The first scaffolded data module is:
- `postgresql.nix` — a minimal PostgreSQL substrate for shared relational state used by foundation and product services.

It intentionally stops at:
- one canonical PostgreSQL baseline;
- basic port, bind, auth, and bootstrap user/database wiring;
- a reusable service contract under the `void.data` namespace.

It does not attempt to own:
- per-product schema design;
- migration orchestration for individual applications;
- HA clustering, failover, or managed-service automation.
