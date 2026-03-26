# Vision v0.2 (Family Hub)

Note: This document is a product vision/roadmap. Not all sections are implemented
in the current backend or UI.

Implementation status (high level):
- Implemented: spaces + dashboards, announcements, directory/services, provisioning,
  auth roles + role mapping, notifications.
- Not implemented yet: devices/heartbeat, ticketing/SLA, health checks, kiosk device
  monitoring.

## Product metaphor: Spaces
Spaces are audience contexts, not physical locations.

- Space: a full-screen workspace for one audience (Guest, Resident, Staff, Admin).
- Dashboard: a block-based layout that changes per Space.
- Isolation: Spaces can be open or locked (Kiosk/Child Lock).

## Portal Home roles (Guest/Resident/Staff/Admin)
Home is role-driven and assembled from blocks; no duplicated products.

- Guest (hotel): Important (guest-only) -> Quick actions (room service/cleaning/Wi-Fi QR/contacts) -> What's new -> Directory.
- Resident (HOA): Important (from management) -> For you (my tickets/bookings) -> Quick actions -> Directory.
- Staff: Important (incidents) -> Tickets queue -> SLA/load -> Ops shortcuts.
- Admin: system-wide overview + audit tooling (current layout).

Key decisions (simplified model):
- Spaces = audience groups (Guest/Kids/Staff/Admin), not physical locations.
- Physical context is Unit + Stay (Room/Apt), not separate spaces.
- UI uses Grafana-like grid; mobile renders in stack mode.
- Announcements stay in core; Booking comes later as a plugin.

Core data model (Postgres, sketch):
- roles(id, key, name, permissions) with built-ins: admin/user/guest (guest can be disabled).
- memberships(principal_id, space_id, role_id, valid_from, valid_to, ...)
- spaces(id, name, type, parent_id, dashboard_template_id, personalization_rules_json, ...)
- units(id, external_ref, label, ...)
- stays(id, principal_id, unit_id, starts_at, ends_at, status, ...)
- announcements(id, space_id, priority, title, body, created_by, expires_at, pinned, ...)
- activity_events(id, space_id, actor_id, type, entity_ref, created_at, payload, ...)
- directory_items(id, space_id, type, key, title, description, icon_url, url, pinned, tags, action_keys[], health_check_json, ...)
- dashboard_templates(id, version, blocks_json, ...)
- user_preferences(principal_id, space_id, hidden_block_ids[], block_order[], ...)

Permissions (MVP):
- view
- manage

OIDC role mapping (MVP):
- Admin overrides via allowlist.
- Role map supports exact email or domain.
- Default role is user; guest can be disabled.

Dashboard blocks (registry in code):
- announcements, resources_pinned, activity_feed, quick_actions
- devices_status (optional)
Each block has default size, min/max, and allowed roles.

Actions + security:
- Client sends only action_key, never unit_id.
- POST /api/actions/invoke { action_key, params }
- Server injects stay_id -> unit_id, checks policy, rate limits, idempotency, and audits.

Layered config / inheritance:
- System defaults -> Shared space -> Audience space -> Template blocks -> User prefs -> Dynamic context (Stay/Unit)
- API returns merged flat result; child overrides parent by key/id.

API (UX + perf):
- GET /api/spaces/:id/dashboard (template + personalization + mobile order)
- GET /api/spaces/:id/blocks/data?ids=... (parallel, priority: announcements -> resources -> activity)
- Soft timeouts per-block; activity is lazy + limited.

Stay lifecycle:
- Stay expiry removes unit-scoped actions; history remains read-only/archived.

Kiosk:
- devices(id, token_hash, space_id, ...) + heartbeat.
- Missing heartbeat -> admin alert + devices status block.
- Kiosk policy: allowlist actions, hide sensitive, auto-return-to-home.

Roadmap:
- MVP: spaces/memberships/templates/preferences, grid editor + mobile stack, announcements + directory, actions + audit, activity (minimal), inheritance.
- V1: tickets + SLA, staff queue, health checks, kiosk heartbeat, presets.
- Later: booking plugin (directory + actions + activity), IoT/housekeeping integrations.

## Architecture layers
### 1) Core (Go + Postgres)
The system state and logic:

- Spaces, roles, memberships, dashboards, directory items.
- Actions: `action_key` invoke with policy checks and audit.
- Activity feed as a unified event layer.

### 2) Presentation (Vue 3 SPA)
The UI and interactions:

- Spaces carousel with role-based dashboards.
- Grafana-like editor for blocks.

## Business logic
### A) Directory item
Atomic item in the system.

- Static data: title, description, icon, url, space, policy.
- Policy: audience groups + pinned flags.

### A.1) Service library (inventory) use case
Why this is valuable as an "inventory":

- Faster "find the thing": links, consoles, runbooks, contacts.
- Lower bus factor: ownership + escalation is explicit.
- Normalize access: how to request, which groups/roles.
- Foundation for health/status (directory_items already model health checks).

Config-first with personalization (recommended split):

- Declared state (source of truth in Git/files):
  - Service metadata: ownership, links, endpoints, tags, tier, visibility.
  - Space placements: which Spaces show it, pinned/order/label.
- User/runtime overlay (DB):
  - Personal pins/hidden/order (user_preferences).
  - Runtime enrichment (health/on-call/deploys) as cached facts with TTL.

Service spec that is easy to automate:

- key, title, description
- service_type (http/s3/postgres/dns/ftp/...)
- owners: team + primary/secondary + oncall ref
- links: docs/runbook/repo/dashboards/logs
- endpoints[]: typed (http/s3/postgres/...)
- visibility/policy: audience_groups/roles
- placements[]: space + pinned + order + label

Service Summary contract (backend → UI blocks):

- base: title, icon, tags
- ownership: owners, oncall
- status: optional health/status snapshot
- links: normalized set (docs/runbook/repo/dashboards/logs)
- endpoints: type + minimal display payload
- actions: filtered by placement allowlist and policy

Dependencies (phased approach):

- Level 0: ownership + links + endpoints + tags + pinned resources block.
- Level 1: depends_on: [service_keys...] (flat, manual for critical).
- Level 2: typed edges (uses/stores_in/auth_via/...) with source + confidence.

Core vs plugin split (pragmatic):

- Core: directory items + pinned resources block + actions invoke + audit + provisioning.
- Plugin: extended service schema, service UI, integrations (GitHub/PagerDuty/K8s),
  enrichment workers, import/generate configs.

Extra fields that pay off early:

- Runbook + escalation path
- Access path (how to request)
- Observability links (dashboards/logs/traces)
- Lifecycle (active/deprecated), tier/criticality
- Data classification (PII/compliance)

### B) Space
Context container for audience-specific content.

- Visual config: background, grid type, density.
- Behavior config: lockable, swipe enabled, kiosk mode.

### C) Personal overlay (visibility layer)
Two levels of Spaces:

- Global Spaces: created by admin (or provisioning). Shared structure.
- Personal overlay: per-user visibility and block preferences.

Example:
- Dad: Home, Admin
- Mom: Home
- Kid: Kids only

### D) Merge rules (Source vs Overrides)
Rules for merging data:

- Provisioned items are owned by config.
- UI edits override only when item is not provisioned.

## UX features
- Kiosk/Child Lock: lock a Space and prevent navigation.
- Smart backgrounds: Space ambience reflects context.

## Developer experience
- Frontend-first: UX and interactions evolve fast in Vue.
- Widget-agnostic: backend stores JSON payloads only.
- Configuration is code (provisioning).

## Provisioning (Grafana-style)
On startup Atrium reads a provisioning file and reconciles DB state.

Flow:
1) Read: `/etc/atrium/provisioning.yaml` (configurable).
2) Diff: compare by key/slug.
3) Upsert: create or update.
4) Missing: archive or clear provisioned items.

Conflict policy:
- Provisioned items are owned by config.
- UI edits are blocked when `is_provisioned = true`.

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

## Fixtures (Dev profiles)
Dev-only seed profiles load mock data for UI testing.

Profiles:
- family
- hotel
- stress

Expected usage:
```
APP_ENV=dev PROFILE=family
APP_ENV=dev PROFILE=hotel
```

## Core schema (proposal)
```sql
CREATE TABLE spaces (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE,
    title VARCHAR(100),
    display_config JSONB DEFAULT '{}',
    dashboard_template_id INT REFERENCES dashboard_templates(id)
);

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    key VARCHAR(50) UNIQUE,
    name VARCHAR(100),
    permissions TEXT[] NOT NULL DEFAULT '{}'
);

CREATE TABLE memberships (
    principal_id UUID,
    space_id INT REFERENCES spaces(id),
    role_id INT REFERENCES roles(id),
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ,
    PRIMARY KEY (principal_id, space_id)
);

CREATE TABLE dashboard_templates (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE,
    version INT,
    blocks_json JSONB DEFAULT '[]'
);

CREATE TABLE user_preferences (
    principal_id UUID,
    space_id INT REFERENCES spaces(id),
    hidden_block_ids JSONB DEFAULT '[]',
    block_order JSONB DEFAULT '[]',
    PRIMARY KEY (principal_id, space_id)
);

CREATE TABLE directory_items (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE,
    title VARCHAR(100),
    description TEXT,
    icon_url TEXT,
    url TEXT,
    space_id INT REFERENCES spaces(id),
    pinned BOOL DEFAULT false,
    policy JSONB DEFAULT '{}'
);

CREATE TABLE announcements (
    id SERIAL PRIMARY KEY,
    space_id INT REFERENCES spaces(id),
    priority VARCHAR(20) DEFAULT 'normal',
    title VARCHAR(200),
    body TEXT,
    pinned BOOL DEFAULT false,
    expires_at TIMESTAMPTZ
);

CREATE TABLE activity_events (
    id SERIAL PRIMARY KEY,
    space_id INT REFERENCES spaces(id),
    actor_id UUID,
    type VARCHAR(50),
    entity_ref VARCHAR(255),
    payload JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```
