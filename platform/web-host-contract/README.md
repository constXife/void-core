# Web Host Contract

## Purpose

This directory defines the canonical contract for session-aware private web hosts in `void-core`.

It exists to keep `Atrium`, standalone product hosts, and future Rust implementations aligned on one
shared contract instead of re-deriving behavior from individual handlers.

This is a contract document, not a product implementation and not a deployment overlay.

## Scope

The current contract covers:

- auth-related environment variables and their semantics;
- canonical auth and session routes;
- session payload shape returned by hosts;
- cookie and redirect expectations;
- the boundary between foundation plumbing and product-specific routes.

The current contract does not cover:

- product-specific HTTP routes;
- HTML or frontend branding;
- database schema details for any product;
- client-owned ingress, domains, or secret values.

## Canonical foundation implementations

This document is now the canonical contract. The active implementation lives in downstream Rust
web hosts, and parity should be measured against this contract rather than against any old
Atrium Go foundation package layout.

## Canonical routes

All private web hosts are expected to reserve these standard routes:

| Route | Meaning |
| --- | --- |
| `/health` | liveness probe returning `200 OK` with a simple `ok` body |
| `/auth/login` | login entrypoint; `GET` starts OIDC login and `POST` may perform local password login when enabled |
| `/auth/callback` | OIDC callback endpoint |
| `/auth/logout` | clears the session and redirects to `/` |
| `/auth/dev-login` | optional development-only login endpoint |
| `/api/auth/modes` | returns enabled login modes |
| `/api/me` | returns current session payload or `null` for anonymous access |

Implementations should keep these route names stable even if the underlying host language changes.

## Auth environment contract

The current first-wave host contract recognizes these env variables:

| Env | Meaning |
| --- | --- |
| `AUTH_DISABLED` | disables auth entirely when truthy |
| `AUTH_GUEST_ENABLED` | anonymous guest mode; enabled unless explicitly false |
| `AUTH_LOCAL_ENABLED` | enables local password login when truthy |
| `AUTH_DEV_LOGIN_ENABLED` | enables development login helpers when truthy |
| `AUTH_COOKIE_SECRET` | required secret for signing session cookies |
| `AUTH_COOKIE_NAME` | optional session cookie name; defaults to `atrium_session` |
| `AUTH_COOKIE_DOMAIN` | optional cookie domain |
| `AUTH_COOKIE_SECURE` | enables secure cookies when set to `1` |
| `AUTH_ALLOWED_EMAILS` | comma-separated allowlist for OIDC users |
| `AUTH_ADMIN_EMAILS` | comma-separated admin email allowlist |
| `AUTH_ROLE_MAP` | comma-separated exact or domain-based role mapping |
| `AUTH_SUBJECT_MAP` | comma-separated email-to-auth-subject mapping |
| `AUTH_DEFAULT_ROLE` | default role when no exact/admin/domain rule matches |
| `AUTH_REDIRECT_HOSTS` | allowlist of forwarded hosts that may override the callback host |
| `AUTH_LOCAL_ADMIN_EMAIL` | bootstrap local admin email |
| `AUTH_LOCAL_ADMIN_PASSWORD` | bootstrap local admin password |

Implementations should preserve these parsing semantics even if helpers live in a different host
runtime.

## Session cookie contract

The canonical session cookie expectations are:

- default cookie name is `atrium_session`;
- cookie path is `/`;
- cookie is `HttpOnly`;
- cookie uses `SameSite=Lax`;
- secure flag follows `AUTH_COOKIE_SECURE`;
- optional domain follows `AUTH_COOKIE_DOMAIN`.

Implementations should preserve these cookie semantics even if symbol names differ across runtimes.

## Redirect contract

Hosts may accept a `next` redirect target, but it must be sanitized before use.

The current contract allows only:

- relative paths starting with `/`

The current contract rejects:

- protocol-relative values such as `//evil.example`
- absolute URLs containing `://`
- values containing backslashes

Implementations should preserve the same `next` sanitization behavior across runtimes.

## Session payload contract

`/api/me` returns either `null` or a JSON object with this shape:

```json
{
  "email": "user@example.com",
  "role": "admin",
  "auth_subject": "subject-123",
  "segment": "operators",
  "stay_id": "stay-123",
  "expires_at": 1760000000,
  "permissions": ["view"]
}
```

Notes:

- `segment` is optional and may be empty for hosts that do not resolve audience segment data;
- `stay_id` is optional;
- `permissions` is host-defined but must always be a JSON array when present;
- anonymous callers receive `null`, not an empty object.

The exact type name may vary across runtimes, but the JSON contract must stay stable.

## Foundation boundary

This contract is intentionally narrow.

`void-core` foundation plumbing may own:

- auth/session middleware;
- auth route installation;
- common session JSON shape;
- env parsing semantics for shared auth behavior.

It must not absorb:

- product-specific dashboards or APIs;
- product-specific login page branding;
- client-owned domain values, secrets, or ingress topology;
- downstream product proxy behavior beyond the shared host seam.

## Relationship to Rust

Rust hosts in downstream repositories should implement this contract, not copy behavior from one
specific Go handler.

Parity should be measured against this contract, not against client-owned overlays or removed
historical Go packages.
