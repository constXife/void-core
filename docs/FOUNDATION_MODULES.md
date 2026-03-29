# Foundation Modules

## Current Scaffold

The first real foundation content in `void-core` is intentionally narrow:

- `naming` — defines the site domain and service FQDN contract
- `secrets/files` — defines the runtime secret-files contract
- `secrets/sops-baseline` — provides an optional `sops-nix` reference baseline for materializing runtime secret files
- `auth/rauthy` — provides a minimal Rauthy container and config-generation integration
- `dns/coredns` — provides a minimal private-zone resolver baseline
- `ingress/caddy` — provides a minimal host-based ingress baseline
- `pki/step-ca` — provides a minimal private CA baseline
- `shell/atrium` — provides the first foundation portal shell source tree and NixOS module baseline

## Why This Comes First

This order matches the first-wave implementation strategy:

1. deployment skeleton
2. private naming contract
3. bootstrap secrets
4. auth baseline
5. private DNS, ingress, and PKI baseline
6. shell baseline via Atrium
7. richer status later

The current modules are scaffolds, not a production-complete identity stack.

## Generated Docs

The foundation module surface also has generated options documentation:

- `nix build .#foundation-options-doc`

That output is included in the flake `checks` so the generated contract docs stay in sync with the module surface.

## Related Templates

`void-core` ships two closely related downstream artifacts:

- `templates/starter/family-core` — copy-oriented starter defaults for baseline foundation services
- `templates/client-deploy/family-core` — a minimal client deployment template that consumes the foundation layer
