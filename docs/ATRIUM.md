# Atrium

## Purpose

`Atrium` is the current foundation shell of `void-core`.

It provides the first concrete implementation of:
- service entry;
- shell and navigation;
- role-aware resource discovery;
- audience-oriented spaces and dashboards.

`Atrium` is not a vertical product.
It is a reusable foundation app that higher-level products and profiles may package,
brand, constrain, or extend.

## Source Layout

The current source tree lives under:

- `platform/apps/atrium`

Related integration points live under:

- `platform/nixos/modules/shell/atrium.nix`
- `platform/packages/atrium`
- `platform/contracts/atrium`

## Why Atrium Lives In `void-core`

`Atrium` belongs in `void-core` because it is part of the public foundation layer:
- it implements shell/navigation capabilities that are required by the base self-hosted contour;
- it is reusable across multiple client profiles and future products;
- it is not tied to one vertical domain such as accounting, library, or inventory;
- keeping it public improves trust and inspectability of the foundation entry layer.

## What Belongs In Atrium

The `Atrium` source tree may contain:
- portal shell source code;
- dashboard and spaces primitives;
- foundation-facing navigation and directory behavior;
- local development assets and build scripts required to evolve the shell;
- public docs for shell behavior and integration.

## What Does Not Belong In Atrium

The `Atrium` source tree should not become the place for:
- closed commercial differentiation;
- client-specific inventory, secrets, or runtime data;
- vertical business logic that belongs to official products;
- product bundles that are specific to one segment only.

Those concerns belong in `void`, client deployment repositories, or future product layers.

## Packaging Model

The current packaging model is:
- app source in `platform/apps/atrium`;
- Nix package expression in `platform/packages/atrium`;
- NixOS module in `platform/nixos/modules/shell/atrium.nix`.

This keeps the source, packaging, and deployment integration separate while preserving
the public foundation boundary.

Current flake package outputs are expected to expose:
- `atrium-source` for the app source tree;
- `atrium-frontend-dist` for the compiled embedded frontend assets;
- `atrium-server` for the backend binary with embedded frontend assets;
- `atrium` as the default shipping server package.
