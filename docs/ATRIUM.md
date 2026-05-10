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
- downstream product repositories may extend `Atrium` with product-facing composition, private defaults, and closed integrations, but should not be a prerequisite for a functional baseline shell.
- downstream host delegation remains an explicit compatibility path, not the default baseline runtime.

## What Belongs In Atrium

The `Atrium` source tree may contain:
- portal shell source code;
- dashboard and spaces primitives;
- foundation-facing navigation and directory behavior;
- shared top bar primitives — brand, space switcher, app launcher dropdown, user avatar/dropdown — used both by Atrium itself and by downstream product hosts that mount the same top bar;
- the global chat trigger contract — shared component that any host can embed to summon assistant chat in the context of the current view (foundation provides the component and panel UI; downstream wires the context provider and the assistant backend);
- the block type registry primitive — the contract that lets templates compose dashboards from typed blocks with validated config (see § "Block Type Registry" below);
- shipped foundation block types in the `core.*` namespace (e.g. `core.resources_pinned`, `core.greeting`);
- shared bottom platform footer primitives — privacy / platform status / help / about link slots common to all spaces;
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
- product-specific host surfaces such as downstream calendar, inventory, or finance UIs;
- specific downstream block type implementations — `assistant.*` aggregator blocks (pending, digest_feed, summary), `<product>.summary.*` per-product blocks. Those live downstream and register with the foundation block runtime via the registry contract;
- specific assistant backend implementation — the chat trigger contract is foundation, but the assistant capability itself is a downstream-provisioned product host.

Those concerns belong in downstream product repositories, client deployment repositories, or future product layers.

## Top Bar Contract

The Atrium top bar has a fixed shape across all spaces and is shared with downstream product hosts that embed the same component:

- **brand** (left) — Atrium / spaces brand block;
- **space switcher pill** (center) — current space label and a dropdown to switch between spaces the user has access to;
- **global chat trigger** (right) — opens a slide-over assistant chat panel; reachable via `Cmd+J` / `Ctrl+J` shortcut (see § "Global Chat Trigger" below);
- **app launcher dropdown** (right) — navigation into product hosts (e.g. `inventory.<domain>`, `calendar.<domain>`); sourced from `directory_items` filtered by `type: product`;
- **user avatar / dropdown** (right) — settings, logout.

The top bar is foundation-owned. Downstream product hosts embed the same shared top bar component so navigation, identity surfacing, and the chat trigger remain consistent across surfaces. Per-host top bars do not invent their own brand placement, space switcher, or launcher.

### Global Chat Trigger

The chat trigger is a **shared foundation component** mounted in the Atrium top bar and in each downstream product host's top bar that wants to expose assistant chat in the current context.

Foundation responsibilities:
- the trigger button itself (label and shortcut binding);
- the slide-over panel with backdrop, message list, and composer;
- the typed `context` prop contract — `surface`, `host`, `path`, `view_kind`, `entity_refs`, `user_visible_summary`, `auth_subject`, `space_id`;
- a clearly visible context line in the panel header reflecting the `user_visible_summary` value.

Downstream responsibilities:
- providing the `context` prop value reflecting the current view;
- providing the assistant capability backend (the trigger does not bring its own backend — it requires a working assistant host, e.g. `assistant.<domain>`).

If no assistant capability is configured for the deployment, the trigger remains hidden or surfaces a disabled state per operator config. The trigger never silently fails — it either works against a real backend or is visibly absent.

## Block Type Registry

Atrium dashboards compose from typed blocks. Each block in a `dashboard_template` references a **block type** by id; the block type contract is part of the foundation, while the catalog of available block types is a layered concern.

Block type contract:
- `id` — `<owner>.<name>.v<n>` (e.g. `core.greeting.v1`, `core.resources_pinned.v1`);
- `config_schema` — typed schema for the `block.config` field, validated when a template instantiates a block of this type;
- `default_layout` — recommended responsive grid size on first add;
- `allowed_in_space_types` — which space `type` values may include this block (for example, a finance summary block may be restricted to `home` and `staff`, excluded from `kids`);
- `audience_groups` — optional ACL filter applied at render time;
- `data_source_contract` — declared scoped reads / queries the block executes;
- `refresh_policy` — `on_view`, `interval:<duration>`, `on_change_feed`.

Foundation owns:
- the registry primitive — registration, validation of `block.config` against `config_schema`, runtime composition;
- block types in the `core.*` namespace shipped with the foundation (minimum baseline currently includes `core.resources_pinned`, used by the admin space).

Foundation does not own:
- `assistant.*` aggregator block types — they live in the downstream assistant capability provider;
- `<product>.summary.*` per-product blocks — owned by each product host that contributes a summary block;
- specific block type catalogs — downstream layers maintain registries of which block types are available in their distribution.

For a canonical example of downstream block type catalog usage on top of the foundation registry, see void's `docs/platform/ATRIUM_BLOCK_REGISTRY.md` (when packaging void as the downstream product layer over `void-core`).

### Versioning

Block type ids carry an explicit version (`v1`, `v2`, …):
- breaking shape changes (rename of a config field, change of `data_source_contract`) require a new major (`assistant.pending.v2`);
- additive changes (new optional config field, new optional data field) stay within the existing major;
- old versions remain available during migration, marked archived in the registry;
- templates pin the major version they reference; upgrading a template to a new major is an explicit operator action.

## Platform Footer

A bottom platform-level footer is shared across all spaces. It is not part of the widget grid, not personalized per-user, and not space-specific.

Canonical foundation slots:
- **Privacy** — link to privacy policy;
- **Platform status** — health / uptime / version;
- **Help** — docs entry;
- **About** — version, license, build info.

Foundation ships the footer primitive and these four canonical link slots. Downstream may add slots (for example, operator-only diagnostics in admin space) but should not remove the foundation slots, and should not relocate footer concerns into the widget grid.

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
