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
- spaces are declarative and reconciled from the client-owned Atrium root;
- archived spaces stay in declared state but are removed from the active runtime/UI;
- announcements CRUD, service catalog CRUD, service placements, and `/ws` live transport are not part of the shipped `v0` surface;
- multi-space/family-facing expansion remains future work rather than a current promise.

## Quick start
1) Enter the repository shell:
   `nix develop`
2) Install frontend dependencies:
   `task frontend-install`
3) Ensure a sibling `../void` checkout exists, or export `VOID_REPO_ROOT=/path/to/void`
4) Start the Rust-backed local dev stack:
   `task fixture-dev`
5) Visit:
   `http://localhost:8080/health`

## Local dev
- Enter the repository shell: `nix develop`
- Copy env file: `cp .env.example .env` and adjust as needed
- Ensure a sibling `../void` checkout exists, or export `VOID_REPO_ROOT=/path/to/void`
- Install frontend deps: `task frontend-install`
- Run the canonical Rust web host with env from `.env`: `task backend-dev`
- Run the same host against the default canonical client root: `task backend-fixture-dev`
- Run frontend dev server: `task frontend-dev`
- Run backend + frontend with an external database: `task dev`
- Run backend + frontend against the default canonical client root: `task fixture-dev`
- Run Atrium tests: `task test`
- Run frontend unit tests: `task frontend-test`
- Run all tests: `task test-all`
- Run smoke checks against a running backend: `task smoke`
- Override the client root explicitly: `ATRIUM_CLIENT_ROOT_PATH=/path/to/client-root task backend-dev`

Local dev is now Rust-host-first: the backend path runs `void-atrium-web` and points it at a
canonical file-first client root. By default that root is `../void/atrium/defaults/profiles/default`.
If you need a different declared baseline, override `ATRIUM_CLIENT_ROOT_PATH`.
`void-core` by itself does not ship the Rust host binary; the local dev entrypoints shell out to
the sibling `void` repository unless `VOID_REPO_ROOT` says otherwise.

## Deployment boundary
- Canonical foundation integration is Nix/NixOS-first via `platform/packages/atrium` and `platform/nixos/modules/shell/atrium.nix`.
- This repository does not currently ship a maintained container-compose path for Atrium.
- If container packaging returns later, it should remain secondary to the canonical Nix/NixOS integration path.

## Declared client root
The canonical runtime now reads Atrium state from a client-owned root directory rather than a
Go-era provisioning file. The expected runtime inputs are:
- `/etc/atrium/client-root` for declared Atrium content and mutations
- `/etc/atrium/widgets.yaml` for widgets payload consumed by the Rust host/runtime

For the current public `v0`, the minimal foundation example is:
- one declared `Admin` space;
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

Local development in this repository no longer ships a bundled compatibility provisioning fixture.
Without an explicit `ATRIUM_CLIENT_ROOT_PATH`, the dev flow uses the default client root from the
sibling `void` checkout.

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
Admin-only routes require an authenticated Atrium admin session from the Rust web host.

## Spaces API
- `GET /atrium/spaces` - list active spaces for the current shell
- `POST /atrium/spaces` - create a space (admin-only)
- `GET /atrium/spaces/:id` - load one space
- `PATCH /atrium/spaces/:id` - update a space (admin-only)
- `POST /atrium/spaces/:id/archive` - archive a space (admin-only)
- `POST /atrium/spaces/:id/restore` - restore an archived space (admin-only)
- `DELETE /atrium/spaces/:id` - delete a space (admin-only)

## Dashboard and workspace API
- `GET /atrium/workspace` - load the canonical workspace shell model
- `GET /atrium/widgets` - load the canonical widgets payload
- `GET /atrium/provisioning/dashboard?space_id=:id` - load the canonical provisioning dashboard snapshot for a provisioned space (admin-only)
- `POST /atrium/dashboard/save?space_id=:id` - save canonical dashboard blocks/preferences for a provisioning-backed space
- `POST /atrium/actions/invoke` - invoke a directory-backed action in the current session

## Directory API
- `GET /atrium/directory-items?space_id=:id` - list directory items for a space (admin-only)
- `POST /atrium/directory-items` - create a directory item (admin-only)
- `PATCH /atrium/directory-items/:id` - update a directory item (admin-only)
- `DELETE /atrium/directory-items/:id` - delete a directory item (admin-only)

## Admin support API
- `GET /atrium/memberships` - list memberships (admin-only)
- `POST /atrium/memberships` - upsert membership (admin-only)
- `POST /atrium/memberships/import` - import memberships (admin-only)
- `DELETE /atrium/memberships/:principal_id/:space_id` - delete membership (admin-only)
- `PATCH /atrium/users/:id/segment` - update user segment (admin-only)

## Auxiliary read API
- `GET /api/me` - current auth/session payload
- `GET /api/auth/modes` - available auth modes

Not part of shipped `v0` API:
- announcements CRUD;
- service catalog CRUD;
- service placement CRUD;
- notifications API;
- `/ws` websocket transport.
