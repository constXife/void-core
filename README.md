# void-core

Public foundation repository for reusable self-hosted building blocks.

`void-core` contains:
- reusable platform primitives;
- NixOS modules for the foundation layer;
- reference profiles and examples;
- foundation-facing contracts and documentation.

`void-core` does not contain:
- closed or vendor-specific product logic;
- client-specific inventory, secrets, or runtime data;
- vertical product behavior tied to a single domain.

## Scope

The initial scaffold focuses on:
- a minimal Nix flake;
- foundation module placeholders;
- a reference profile for `family-core-minimal`;
- a client deployment template for `family-core`;
- a first naming / DNS / ingress / private-CA scaffold for private deployments;
- short documentation for trust model, distribution baseline, and extensibility.

## Documentation Language

Canonical documentation in `void-core` should be written in English.

Translations may be added later as optional convenience material, but the English version should remain the source of truth for:
- repository structure;
- contracts and interfaces;
- trust and distribution guarantees.
