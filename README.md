# void-core

`void-core` is the public foundation repository for reusable self-hosted building blocks.

It exists so higher-level product repos and client-owned deployment repos can build on a shared, auditable baseline instead of re-implementing the same foundation concerns or depending on a hidden SaaS control plane.

## Why this project exists

`void-core` is meant to strengthen:
- client ownership;
- auditability;
- portability;
- offline and degraded usefulness;
- reproducible, declarative self-hosted deployments.

In practice, it gives downstream layers a stable foundation for naming, secrets contracts, identity, private DNS, ingress, private PKI, and a foundation shell.

## What belongs here

- reusable NixOS foundation modules;
- foundation packages and contracts;
- reference profiles and deployment templates;
- foundation-facing documentation;
- shared building blocks that downstream repos can compose.

## What does not belong here

- closed or product-specific business logic;
- client-specific inventory, secrets, or runtime state;
- domain-specific behavior that only makes sense in one downstream product;
- a mandatory vendor-operated control plane.

## Quick start

1. Enter the development shell:

   ```bash
   nix develop
   ```

2. Format the repository:

   ```bash
   nix fmt
   ```

3. Run the local checks:

   ```bash
   nix run .#lint
   nix run .#governance-lint
   nix flake check
   ```

4. If you want to see how this foundation is consumed by a client-owned deployment repo, start with:

   `templates/client-deploy/default/README.md`

## Read next

- `docs/README.md` — documentation map
- `docs/TRUST_MODEL.md` — ownership and trust boundary
- `docs/DISTRIBUTION_BASELINE.md` — self-hosted and NixOS-first baseline
- `docs/FOUNDATION_COMPONENTS.md` — current foundation component inventory
- `docs/ATRIUM.md` — role and limits of the Atrium foundation shell

## Notes

- Canonical documentation in `void-core` is English-first.
- `void-core` is licensed under the Apache License 2.0.
