# Service Library (Directory Items)

This document describes the service catalog model (`services` + `service_placements`)
and how it materializes into `directory_items` for Space UI.

## ServiceSpec fields (canonical)

Minimal spec (JSON/YAML shape):
```yaml
service_type: "http"
owners:
  team: "platform"
  primary: "ops@example.com"
  secondary: "dev@example.com"
  oncall: "pagerduty://team/platform"
links:
  docs: "https://docs.example.com/service"
  runbook: "https://runbook.example.com/service"
  repo: "https://github.com/org/service"
  dashboards:
    - "https://grafana.example.com/d/abc"
  logs:
    - "https://logs.example.com/service"
endpoints:
  - type: "http"
    url: "https://service.example.com/health"
tier: "tier-1"
lifecycle: "active"
access_path: "Request access via #it-requests"
runbook_url: "https://runbook.example.com/service"
classification: "internal"
depends_on:
  - "core.auth"
  - "core.db"
```

## Provisioning example
```yaml
services:
  - key: "core.auth"
    title: "Auth Service"
    description: "OIDC and session management"
    icon_url: "/icons/auth.svg"
    service_type: "http"
    tags: ["auth", "core"]
    owners:
      team: "platform"
      primary: "ops@example.com"
    links:
      docs: "https://docs.example.com/auth"
      runbook: "https://runbook.example.com/auth"
      repo: "https://github.com/org/auth"
      dashboards:
        - "https://grafana.example.com/d/abc"
      logs:
        - "https://logs.example.com/auth"
    endpoints:
      - key: "health"
        type: "http"
        url: "https://auth.example.com/health"
    tier: "tier-1"
    lifecycle: "active"
    classification: "internal"
    depends_on: ["core.db", "core.observability"]

service_placements:
  - service_key: "core.auth"
    space: "home-admin"
    label: "Auth"
    pinned: true
    order: 10
    group: "Security"
    audience_groups: ["admin"]
    allowed_actions: ["auth.reset", "auth.rotate_keys"]
    visible_links: ["docs", "runbook", "dashboards"]
    primary_url: "https://auth.example.com"
    default_endpoint: "health"
    access_path: "Request access via #it-requests"
```

## API
Canonical models are `services` and `service_placements`. Each placement is
materialized into `directory_items` for Space UI blocks. The old directory API
remains usable for generic resources.

## Service Summary contract
Backend should expose a stable "Service Summary" shape for any block to consume:
- base: title, icon, tags
- ownership: owners, oncall
- status: optional health/status snapshot
- links: normalized set (docs/runbook/repo/dashboards/logs)
- endpoints: type + minimal display payload
- actions: already filtered by placement allowlist and policy

Blocks should depend on this summary contract rather than internal schemas.

## Notes
- JSON fields are stored as JSONB.
- Runtime data (health, on-call, deploys) should be kept in a separate cache
  table and merged at read time.
- `icon_url` can be a local asset path (e.g. `/icons/printer.svg`) when files are
  placed in `frontend/public/icons/` and embedded into the backend.
