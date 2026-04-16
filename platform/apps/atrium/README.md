# atrium

Admin-first Atrium implementation for `void-core`, with config-first spaces,
dashboards, directory content, and operator workflows.

This source tree is the current public `Atrium` app in `void-core`.

Canonical integration points live in:
- `../../nixos/modules/shell/atrium.nix`
- `../../packages/atrium`

Canonical frontend header composition now lives in:
- `frontend/src/platform/components/README.md`

The intended split is:
- reusable header primitives and dropdown contract in `frontend/src/platform/components/`;
- product-specific header assembly in `frontend/src/components/`.

## Current release scope
Current `v0` is intentionally narrow:
- the shipped product surface is `Admin`-first and operator-facing;
- the default dashboard is resource-first and built around pinned directory resources;
- spaces are declarative and reconciled from provisioning;
- archived spaces stay in provisioning but are removed from the active runtime/UI;
- announcements CRUD, service catalog CRUD, service placements, and `/ws` live transport are not part of the shipped `v0` surface;
- multi-space/family-facing expansion remains future work rather than a current promise.

## Quick start
1) Start Postgres and app:
   `task compose-up`
2) Visit:
   `http://localhost:8080/health`

## Local dev
- Enter the repository shell: `nix develop`
- Copy env file: `cp .env.example .env` and adjust as needed
- Install frontend deps: `task frontend-install`
- Start only Postgres: `task compose-db`
- Stop local compose services: `task compose-down`
- Run migrations: `task migrate`
- Run backend dev server with env: `task backend-dev`
- Run frontend dev server: `task frontend-dev`
- Run full local stack (db + backend + frontend): `task dev`
- Run backend tests: `task test`
- Run frontend unit tests: `task frontend-test`
- Run all tests: `task test-all`
- Run smoke checks against a running backend: `task smoke`
- Run fixture-backed dev mode: `task backend-dev PROFILE=family` (also `hotel`, `stress`)

Fixture profiles still seed into Postgres; they are not a separate in-memory runtime mode.
When `PROFILE` is set, the backend seeds the selected fixture into the local runtime. This path
is useful for public/demo validation, but it still targets dashboard/resource behavior rather than
full admin CRUD flows.

## Deployment boundary
- Canonical foundation integration is Nix/NixOS-first via `platform/packages/atrium` and `platform/nixos/modules/shell/atrium.nix`.
- Container packaging is a secondary convenience/demo path for quick evaluation or app-level packaging.
- Docker should not be treated as the canonical distribution model of Atrium inside `void-core`.

## Provisioning (Grafana-style)
On startup Atrium reads a provisioning file and reconciles DB state.
Default path: `/etc/atrium/provisioning.yaml` (overridable via `PROVISIONING_PATH`).
Widgets path: `/etc/atrium/widgets.yaml` (overridable via `WIDGETS_CONFIG_PATH`).

For the current public `v0`, the minimal foundation example is:
- one provisioned `Admin` space;
- one dashboard template with `core.resources_pinned`;
- one resource catalog backed by `directory_items`.

Example:
```yaml
roles:
  - key: "admin"
    name: "Admin"
    permissions: ["view", "manage"]
    is_builtin: true

spaces:
  - id: "admin"
    title: "Admin"
    type: "staff"
    state: "active"
    layout_mode: "grid"
    url: "admin"
    groups: ["admin"]
    dashboard_template: "admin"

dashboard_templates:
  - key: "admin"
    version: 1
    blocks:
      - id: "admin-pinned-resources"
        type: "core.resources_pinned"
        title: "Pinned resources"
        layout:
          lg: { x: 1, y: 1, w: 6, h: 2 }
          xs: { order: 1 }
        config:
          limit: 8
          scope: "this"
          filter: "pinned"

directory_items:
  - key: "id.example.local"
    title: "Rauthy"
    description: "OIDC identity provider"
    url: "https://id.example.local"
    type: "resource"
    space: "admin"
    pinned: true
    audience_groups: ["admin"]
```

Local development in this repository no longer ships a bundled provisioning fixture.
Without an explicit `PROVISIONING_PATH` or `CONFIG_DIR`, Atrium starts without preloaded provisioned state.

## Space display_config (UI behavior)
Supported keys (frontend):
- `kiosk`: `true|false` (hide header + prevent space switcher).
- `default_lang`: `"en"|"ru"` (per-space default).
- `supported_langs`: `["en","ru"]` (limits UI switcher).
- `language_switcher`: `"off"|"header"|"settings"`.
- `performance_mode`: `"low"|"normal"` (force mode; otherwise auto/user pref).
- `backgrounds`: list of backgrounds with optional `when` conditions.
- `background_mode`: `"static"|"time"|"random"|"rotate"`.
- `background_rotate_minutes`: rotation interval for `"rotate"` and `"random"` modes.
- `segment_options`: list of allowed user segments for the admin dropdown.

Backgrounds (examples):
```yaml
display_config:
  segment_options: ["kid-girl", "kid-boy", "adult"]
  background_mode: "time"
  backgrounds:
    - url: "/bg/kids-girl.jpg"
      when: { segment: "kid-girl" }
    - url: "/bg/kids-boy.jpg"
      when: { segment: "kid-boy" }
    - url: "/bg/morning.jpg"
      when: { from: "06:00", to: "12:00" }
    - url: "/bg/night.jpg"
      when: { from: "20:00", to: "06:00" }
    - url: "/bg/default.jpg"
```

Modes:
- `static`: use the first matching background, else fallback.
- `time`: re-evaluate every minute using `when.from/to`.
- `random`: choose a random background per `background_rotate_minutes` window.
- `rotate`: cycle backgrounds every `background_rotate_minutes` minutes.

## Config-first mode
Enable config-first to make YAML the source of truth for spaces, dashboard templates,
directory items, and widgets. Admin changes write back to the provisioning file and
trigger a reload into the DB.

In current `v0`, config-first write-back should be read as an operator convenience for
the narrow `Admin` resource catalog flow, not as a generic topology editor or a broader
service-catalog authoring model.

Space lifecycle in config-first mode should be read as:
- add a space: add its declaration to `provisioning.yaml`;
- archive a space: keep the declaration, but set its state to `archived`;
- delete a space: remove its declaration from `provisioning.yaml` so the next reconcile removes it from the active product UI.

The product contract should not rely on a global env flag as the main way to archive one specific space.
Per-space lifecycle belongs in provisioning data, not in process-level toggles.

Environment variables:
- `CONFIG_FIRST` (`true`/`false`, default `false`)
- `CONFIG_DIR` (when set, uses `provisioning.yaml` and `widgets.yaml` from that folder)
- `CONFIG_RELOAD_MODE` (`manual`, `watch`, `both`; default `manual`)
- `CONFIG_PRESERVE_TEMPLATE_ON_RENAME` (`true`/`false`, default `true`)

Reload endpoint (admin-only when auth is enabled):
- `POST /api/config/reload`

## Personas matrix
| Feature / Profile | Family | SMB | HOA | Hotel |
| --- | --- | --- | --- | --- |
| Auth | OIDC (Gmail) | OIDC (Corp) | Link / Phone | QR / Token |
| Trust level | High | Medium | Low | None |
| Groups | Parents/Kids | Departments | Buildings | Rooms |
| Dashboard | Personal blocks | Template -> Personal | Template (soft lock) | Template (hard lock) |
| Spaces | Admin only | Admin only | Admin only | Admin only |
| Data lifecycle | Permanent | Permanent (until offboarding) | Long-lived | 2 days |

## Auth (OIDC)
Enable auth by setting `AUTH_DISABLED=0` and providing the variables below:

- `OIDC_ISSUER`
- `OIDC_CLIENT_ID`
- `OIDC_CLIENT_SECRET`
- `OIDC_REDIRECT_URL`
- `AUTH_ALLOWED_EMAILS` (comma-separated)
- `AUTH_ADMIN_EMAILS` (comma-separated)
- `AUTH_DEFAULT_ROLE` (optional, defaults to `user`)
- `AUTH_ROLE_MAP` (optional, comma-separated `email=role` or `@domain=role`)
- `AUTH_GUEST_ENABLED` (`0` to disable guest role)
- `AUTH_COOKIE_SECRET` (random string)
- `AUTH_COOKIE_NAME` (optional)
- `AUTH_COOKIE_SECURE` (`1` for HTTPS)

Routes:
- `GET /auth/login`
- `GET /auth/callback`
- `POST /auth/logout`

Example (Google):
```bash
export AUTH_DISABLED=0
export OIDC_ISSUER="https://accounts.google.com"
export OIDC_CLIENT_ID="google-client-id"
export OIDC_CLIENT_SECRET="google-client-secret"
export OIDC_REDIRECT_URL="http://localhost:8080/auth/callback"
export AUTH_ALLOWED_EMAILS="admin@example.com,user@example.com"
export AUTH_ADMIN_EMAILS="admin@example.com"
export AUTH_COOKIE_SECRET="replace-with-long-random-string"
export AUTH_COOKIE_SECURE=0
```

Example (GitHub):
```bash
export AUTH_DISABLED=0
export OIDC_ISSUER="https://token.actions.githubusercontent.com"
export OIDC_CLIENT_ID="github-client-id"
export OIDC_CLIENT_SECRET="github-client-secret"
export OIDC_REDIRECT_URL="http://localhost:8080/auth/callback"
export AUTH_ALLOWED_EMAILS="admin@example.com,user@example.com"
export AUTH_ADMIN_EMAILS="admin@example.com"
export AUTH_COOKIE_SECRET="replace-with-long-random-string"
export AUTH_COOKIE_SECURE=0
```

## Admin gating
Use `auth.RequireRole("admin", handler)` for admin-only endpoints (e.g. provisioning, templates).

## Spaces API
- `GET /api/categories` - list categories (auth if enabled)
- `GET /api/spaces?include_archived=1` - list active + archived spaces for admin UI
- `POST /api/categories` - create category (admin-only)
- `PATCH /api/categories/:id` - update category (admin-only)
- `POST /api/spaces/:id/archive` - archive a provisioned space (admin-only)
- `POST /api/spaces/:id/restore` - restore an archived provisioned space (admin-only)
- `DELETE /api/categories/:id` - delete category (admin-only)

## Dashboard and workspace API
- `GET /api/v1/workspace` - load the current workspace shell model
- `GET /api/spaces/:id/dashboard` - load dashboard payload for a space
- `PUT /api/spaces/:id/dashboard` - save dashboard blocks/preferences
- `GET /api/spaces/:id/blocks/data` - resolve block data for dashboard blocks
- `POST /api/actions/invoke` - invoke a directory-backed action in the current session
- `GET /api/dashboard/templates` - list dashboard templates (admin-only)

## Directory API
- `GET /api/directory_items?space_id=:id` - list directory items for a space (admin-only)
- `POST /api/directory_items` - create a directory item (admin-only)
- `PATCH /api/directory_items/:id` - update a directory item (admin-only)
- `DELETE /api/directory_items/:id` - delete a directory item (admin-only)

## Admin support API
- `GET /api/roles` - list roles (admin-only)
- `GET /api/memberships` - list memberships (admin-only)
- `POST /api/memberships` - upsert membership (admin-only)
- `POST /api/memberships/import` - import memberships (admin-only)
- `DELETE /api/memberships/:principal_id/:space_id` - delete membership (admin-only)
- `PATCH /api/users/:id` - update user segment (admin-only)
- `POST /api/config/reload` - reload config-first state (admin-only when auth is enabled)

## Auxiliary read API
- `GET /api/me` - current auth/session payload
- `GET /api/auth/modes` - available auth modes
- `GET /api/widgets` - auxiliary note/widget feed
- `GET /api/widgets/note` - auxiliary note payload

Not part of shipped `v0` API:
- announcements CRUD;
- service catalog CRUD;
- service placement CRUD;
- notifications API;
- `/ws` websocket transport.
