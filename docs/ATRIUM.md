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

## Why Atrium Lives In `void-core`

`Atrium` belongs in `void-core` because it is part of the public foundation layer:
- it implements shell/navigation capabilities that are required by the base self-hosted contour;
- it is reusable across multiple client profiles and future products;
- it is not tied to one vertical domain such as accounting, library, or inventory;
- keeping it public improves trust and inspectability of the foundation entry layer.

## Functional Independence

The boundary for `Atrium` is not just "public shell source code".

Normatively:
- users should be able to obtain a working `Atrium` from `void-core` alone;
- the functional host/runtime path, package path, and baseline NixOS integration for the foundation shell belong here;
- downstream repositories such as `void` may extend `Atrium` with product-facing composition, private defaults, and closed integrations, but should not be a prerequisite for a functional baseline shell.
- downstream host delegation remains an explicit compatibility path, not the default baseline runtime.

## What Belongs In Atrium

The `Atrium` source tree may contain:
- portal shell source code;
- dashboard and spaces primitives;
- foundation-facing navigation and directory behavior;
- local development assets and build scripts required to evolve the shell;
- public docs for shell behavior and integration.

It may also contain reusable host or session plumbing needed by downstream products,
but not the product-specific implementation of those downstream hosts.

## What Does Not Belong In Atrium

The `Atrium` source tree should not become the place for:
- closed commercial differentiation;
- client-specific inventory, secrets, or runtime data;
- vertical business logic that belongs to official products;
- product bundles that are specific to one segment only.
- product-specific host surfaces such as downstream calendar, inventory, or finance UIs.

Those concerns belong in `void`, client deployment repositories, or future product layers.

## Packaging Model

The current packaging model is:
- app source in `platform/apps/atrium`;
- Nix package expression in `platform/packages/atrium`;
- NixOS module in `platform/nixos/modules/shell/atrium.nix`.

This keeps the source, packaging, and deployment integration separate while preserving
the public foundation boundary.

For Atrium specifically:
- the public foundation should ship a functionally usable shell path, not only frontend assets for a downstream host;
- the canonical foundation integration path is the Nix package expression plus the NixOS module;
- the repository does not currently ship a maintained container-compose path for Atrium;
- if container packaging returns later, it must remain secondary to the canonical Nix/NixOS integration path.

Current flake package outputs are expected to expose:
- `atrium-source` for the app source tree;
- `atrium-frontend-dist` for the compiled embedded frontend assets built from source during the Nix build;
- `atrium-client-root-default` for the minimal bundled foundation client root;
- `atrium-widgets-default` for the default bundled widgets payload;
- `atrium-host-rust` for the transitional host shim binary owned by `void-core`;
- `atrium-server` for the standalone preview-backed server wrapper owned by `void-core`;
- `atrium-run` and `atrium-backend-dev` as transitional dev launchers owned by `void-core`;
- `atrium` as the default compiled frontend artifact for downstream host packages.

The package set also owns the canonical server-wrapper contour:
- `platform/packages/atrium/server.nix` wraps a compatible host binary with the embedded frontend dist;
- `platform/packages/atrium/host-rust.nix` builds the transitional `Atrium` host shim from `void-core` source;
- `platform/packages/atrium/default.nix` exposes `serverFor` as the canonical integration seam for a runnable Atrium host package.

That means package/module ownership for the foundation shell already lives in `void-core`,
and the first Rust host source contour already lives here,
even if the full foundation runtime implementation is still in migration.

The current shim defaults to standalone preview mode, so `void-core` now has a first
local foundation runtime path that does not require exec-ing a downstream host binary.

The current NixOS module now defaults to that standalone path:
- `services.atrium.package` defaults to the `void-core`-owned preview-backed `atrium-server`;
- `services.atrium.hostMode` defaults to `preview`;
- downstream `shim` mode remains available, but it is no longer required for a functional baseline shell.

Current standalone preview capabilities now include:
- serving the bundled Atrium frontend dist directly from the `void-core` host;
- foundation read endpoints for workspace, spaces, widgets, memberships, and provisioning previews;
- file-backed `spaces` CRUD that writes through to the declared `client-root`.
- file-backed `directory_items` CRUD that writes through to declared `resources/*.yaml` and `placements/*.yaml`.
- file-backed `dashboard/save` persistence that writes canonical template blocks to `templates/*.yaml` and preview hidden-block state to per-user overlay files under `user-overlays/`.
- workspace and mutation responses shaped around `workspace.current_space.dashboard`, including `blocks`, `block_order`, `hidden_block_ids`, `visible_block_ids`, and `visible_blocks`.
- richer standalone block materialization, including `contract.inspect` payloads for resources and summary-style dashboard blocks.
- preview identity env inputs and a first per-user overlay seam through `/api/me`, `/atrium/memberships`, and `user-overlays/<user>/*.yaml`.

## Localization Contract

Atrium uses the platform localization contract owned by `void-core`.
Localizable read-model fields are structured values, not fallback strings.

Canonical shape:

```json
{
  "key": "atrium.space.admin.title",
  "translations": {
    "en": "Admin",
    "ru": "Администрирование"
  }
}
```

The platform fallback language is `en`.
The fallback language is resolved from `translations.en`; there is no separate
`fallback_label` field.

Client-owned repositories may provide their own localized values for spaces,
resources, placements, dashboard blocks, and other operator-owned labels through
their Atrium client root or overlays.
The platform resolver selects the current language, then the platform fallback
language, then the stable key.
