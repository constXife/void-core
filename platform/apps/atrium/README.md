# atrium

Audience-first foundation shell with configurable spaces, dashboards, and directory content.

This source tree is the current implementation of the public `Atrium` shell in `void-core`.

Canonical integration points live in:
- `../../nixos/modules/shell/atrium.nix`
- `../../packages/atrium`
- `../../contracts/atrium`

## Quick start
1) Start Postgres and app:
   `task compose-up`
2) Visit:
   `http://localhost:8080/health`

## Local dev
- Run server: `task run`
- Run migrations: `task migrate`
- Run tests: `task test`
- Run smoke checks: `task smoke`
- Frontend dev server: `task frontend-dev` (uses `bun`)
- Copy env file: `cp .env.example .env` and adjust as needed
- Full local stack (db + backend + frontend): `task dev`
- Dev fixtures: `task dev PROFILE=family` (also `hotel`, `stress`)

## Provisioning (Grafana-style)
On startup Atrium reads a provisioning file and reconciles DB state.
Default path: `/etc/atrium/provisioning.yaml` (overridable via `PROVISIONING_PATH`).
Widgets path: `/etc/atrium/widgets.yaml` (overridable via `WIDGETS_CONFIG_PATH`).

Example:
```yaml
roles:
  - key: "admin"
    name: "Admin"
    permissions: ["view", "manage"]
    is_builtin: true

spaces:
  - id: "home-admin"
    title: "Admin"
    type: "staff"
    layout_mode: "grid"
    url: "home-admin"
    groups: ["admin"]
    dashboard_template: "home-admin"

dashboard_templates:
  - key: "home-admin"
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
  - key: "grafana.arkham.void"
    title: "Grafana"
    description: "Metrics and observability"
    icon_url: "https://raw.githubusercontent.com/lllllllillllllillll/Dashboard-Icons/main/png/grafana.png"
    url: "https://grafana.arkham.void"
    type: "service"
    space: "home-admin"
    pinned: true
    audience_groups: ["admin"]
  - key: "id.arkham.void"
    title: "Rauthy"
    description: "OIDC identity provider"
    url: "https://id.arkham.void"
    type: "service"
    space: "home-admin"
    pinned: true
    audience_groups: ["admin"]
  - key: "mail.arkham.void"
    title: "Mailpit"
    description: "Local mail catcher"
    url: "https://mail.arkham.void"
    type: "service"
    space: "home-admin"
    pinned: true
    audience_groups: ["admin"]
```

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

Environment variables:
- `CONFIG_FIRST` (`true`/`false`, default `false`)
- `CONFIG_DIR` (when set, uses `provisioning.yaml` and `widgets.yaml` from that folder)
- `CONFIG_RELOAD_MODE` (`manual`, `watch`, `both`; default `manual`)
- `CONFIG_PRESERVE_TEMPLATE_ON_RENAME` (`true`/`false`, default `true`)

Reload endpoint (admin-only when auth is enabled):
- `POST /api/config/reload`

## Service library
Service catalog model (`services` + `service_placements`) and materialization into
`directory_items` are documented in `docs/service-library.md`.

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
- `POST /api/categories` - create category (admin-only)
- `PATCH /api/categories/:id` - update category (admin-only)
- `DELETE /api/categories/:id` - delete category (admin-only)
