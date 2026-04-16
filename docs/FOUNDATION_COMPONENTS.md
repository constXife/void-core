# Foundation Components

## Purpose

This document defines the canonical inventory of first-wave foundation components in `void-core`
and explains how the foundation layer is expected to use them.

It exists to:
- make the first-wave foundation stack explicit;
- separate reusable foundation components from product-specific composition;
- clarify which parts belong to `void-core` and which remain client-owned deployment reality.

This document is not:
- a client host inventory;
- a secret manifest;
- a complete production BOM;
- a promise that every deployment must be identical.

## How to read this inventory

Each component below is described in terms of:
- its role in the foundation contour;
- how `void-core` uses it;
- where the boundary sits between foundation and client deployment;
- whether it is part of the first-wave baseline.

The goal is to describe reusable building blocks, not to encode one customer's exact topology.

## First-wave baseline

The current first-wave foundation baseline is intentionally narrow:
- `naming`
- `secrets/files`
- `secrets/sops-baseline`
- `data/postgresql`
- `auth/rauthy`
- `dns/coredns`
- `ingress/caddy`
- `pki/step-ca`
- `shell/atrium`

Together these components provide:
- stable service naming;
- a baseline runtime secret contract;
- a canonical SQL substrate for shared foundation and product state;
- identity and protected web access;
- private DNS;
- private HTTPS and trust bootstrap;
- a first operator-facing shell.

## Module scaffold and implementation order

The current modules are scaffolds, not a production-complete identity stack.

The first-wave implementation order is:

1. deployment skeleton
2. private naming contract
3. bootstrap secrets
4. relational state substrate
5. auth baseline
6. private DNS, ingress, and PKI baseline
7. shell baseline via Atrium
8. object storage and richer state later

Within that scaffold, the current expectation is:

- `naming` defines neutral FQDN slots not only for `id`, `ca`, and `s3`, but also for `atrium`, `api`, `mcp`, `calendar`, `inventory`, and `finance`
- `ingress/caddy` exposes a generic published-host map so higher layers can bind a concrete shell or product host to an upstream without forking the ingress module

For object storage specifically, the intended split is:

- `void-core` provides the reusable `Garage` substrate and a generic provisioning contract
- product repositories may publish recommended default bucket shapes
- client-owned deployment repositories decide which defaults to enable, which concrete names/secrets to supply, and which extra buckets or grants to add

## Foundation component inventory

| Component | First-wave status | Role | How `void-core` uses it | Boundary |
| --- | --- | --- | --- | --- |
| `naming` | `required` | defines the site domain and service FQDN contract | foundation modules derive shell, API, MCP, and product-host naming from a neutral site-domain model instead of hardcoded hostnames | concrete domain values and DNS delivery remain client-owned |
| `secrets/files` | `required` | defines the runtime secret-files contract | modules consume file paths and secret material contracts without owning the secret values themselves | secret values, storage, rotation, and delivery remain client-owned |
| `secrets/sops-baseline` | `optional baseline companion` | provides a reference way to materialize runtime secret files via `sops-nix` | foundation offers a canonical integration path for teams that want declarative secret materialization | deployments may use another compatible secret delivery path |
| `data/postgresql` | `required` | provides the canonical SQL substrate for shared service state | foundation exposes a reusable database primitive for services such as `Rauthy` and other product-level consumers that require relational state | physical placement, credentials, HA/backup posture, sizing, and tenant-specific database layout remain client-owned |
| `auth/rauthy` | `required` | provides the first identity and protected web access baseline | foundation exposes a reusable auth primitive and integration seam for protected internal web endpoints | realm data, credentials, policies, and operational rollout remain client-owned |
| `dns/coredns` | `required` | provides the preferred private-zone DNS resolver baseline | foundation uses `CoreDNS` as the first canonical private naming implementation | router, DHCP, network distribution, and environment-specific records remain client-owned |
| `ingress/caddy` | `required` | provides the preferred host-based ingress baseline | foundation uses `Caddy` as the first canonical reverse-proxy entry for internal web services and exposes a generic published-host seam for shell or product hosts | actual ingress placement, certificates wiring, host enablement, and deployment topology remain client-owned |
| `pki/step-ca` | `required` | provides the preferred private CA and certificate issuance baseline | foundation uses `step-ca` as the first canonical private trust and ACME-compatible issuance primitive | root trust distribution, bootstrap handling, and CA operational material remain client-owned |
| `shell/atrium` | `required` | provides the first foundation shell and entry surface | foundation exposes a reusable portal shell that higher-level products and profiles may package and extend | product-specific spaces, composition, and resource catalogs belong above the foundation layer |
| `storage/garage` | `optional foundation companion` | provides the preferred object-storage substrate for blobs and large artifacts | foundation may expose an S3-compatible storage primitive for media, attachments, exports, backups, and other binary objects without pushing those payloads into graph or SQL models; it may also expose a generic declarative provisioning seam for baseline buckets, service accounts, and grants | bucket layout, retention, replication, durability choices, secret values, and concrete client data remain client-owned |

## Usage principles

The inventory above should be interpreted with these rules:

1. `void-core` owns reusable primitives and contracts.
2. `void-core` may ship reference defaults and integration seams.
3. `void-core` must not own client inventory, secrets, or runtime data.
4. Products built above the foundation may compose these primitives differently, but should not redefine their core contracts casually.
5. This component inventory is an explicit scope boundary: code that cannot be justified by these documented foundation responsibilities should live downstream, not in `void-core`.

## Relationship to products

`void-core` describes reusable components.
Product repositories such as `void` describe how those components are packaged into a product contour.

Examples:
- `Caddy` belongs here as a foundation ingress baseline.
- `Atrium` as a foundation shell belongs here.
- `PostgreSQL` as a shared relational substrate belongs here.
- `Garage` as a preferred object-storage primitive belongs here.
- a product-specific operator resource list does not belong here.
- a client-specific deployment inventory does not belong here.

## Generated docs and template

The foundation module surface also has generated options documentation:

- `nix build .#foundation-options-doc`

That output is included in the flake `checks` so the generated contract docs stay in sync with the module surface.

`void-core` also ships a minimal client deployment template under:

- `templates/client-deploy/default`

This template shows how a client-owned deployment repository is expected to consume the foundation layer and includes baseline service defaults for the first setup.

## Related documents

- `TRUST_MODEL.md` — trust, ownership, and boundary guarantees
- `ATRIUM.md` — the role and limits of the Atrium foundation shell

## What is not canonical yet

- multiple equal first-wave ingress baselines;
- a different auth system as an equally supported first-wave default;
- a managed control plane as a required dependency;
- client-specific services becoming part of the public foundation contract by accident.
