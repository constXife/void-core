# Foundation Modules

## Current Scaffold

The first real foundation content in `void-core` is intentionally narrow:

- `naming` — defines the site domain and service FQDN contract
- `secrets/files` — defines the runtime secret-files contract
- `secrets/sops-baseline` — provides an optional `sops-nix` reference baseline for materializing runtime secret files
- `data/postgresql` — provides the canonical relational storage substrate for foundation and product consumers
- `auth/rauthy` — provides a minimal Rauthy container and config-generation integration
- `dns/coredns` — provides a minimal private-zone resolver baseline
- `ingress/caddy` — provides a minimal host-based ingress baseline
- `pki/step-ca` — provides a minimal private CA baseline
- `shell/atrium` — provides the first foundation portal shell source tree and NixOS module baseline
- `storage/garage` — optional object-storage substrate for binary artifacts and media, including a declarative provisioning seam for baseline buckets and service accounts

## Why This Comes First

This order matches the first-wave implementation strategy:

1. deployment skeleton
2. private naming contract
3. bootstrap secrets
4. relational state substrate
5. auth baseline
6. private DNS, ingress, and PKI baseline
7. shell baseline via Atrium
8. object storage and richer state later

The current modules are scaffolds, not a production-complete identity stack.

For object storage specifically, the intended split is:

- `void-core` provides the reusable `Garage` substrate and a generic provisioning contract
- product repositories may publish recommended default bucket shapes
- client-owned deployment repositories decide which defaults to enable, which concrete names/secrets to supply, and which extra buckets or grants to add

## Generated Docs

The foundation module surface also has generated options documentation:

- `nix build .#foundation-options-doc`

That output is included in the flake `checks` so the generated contract docs stay in sync with the module surface.

## Related Template

`void-core` also ships a minimal client deployment template under:

- `templates/client-deploy/default`

This template shows how a client-owned deployment repository is expected to consume the foundation layer and includes baseline service defaults for the first setup.
