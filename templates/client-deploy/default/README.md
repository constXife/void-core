# default Client Deployment Template

This template shows how a client-owned deployment repository can consume `void-core`.

It is intentionally narrow:
- one host;
- one selected profile;
- one secrets baseline;
- one naming contract;
- one optional private DNS / CA / ingress path;
- one install/update/rollback flow.

## Purpose

This is not vendor-owned state.

It is a template for a client-controlled deployment repository that:
- references `void-core` as an input;
- may later add additional product or distribution layers;
- keeps hosts, inventory, overlays, and secrets under client control.

## Layout

- `flake.nix` — client deployment entrypoint
- `hosts/` — host-specific NixOS entrypoints
- `profiles/` — selected shipping profile wiring
- `inventory/` — environment-specific inventory
- `overlays/` — local policy and composition changes
- `secrets/` — encrypted secret material placeholders
- `dns/` — client-owned private zone examples
- `ca/` — trust bootstrap material
- `ops/` — install/update/rollback wrappers

## Usage Notes

Before using this template, a client or operator is expected to:
- replace `path:../../../` with the actual `void-core` source location or channel;
- generate `hardware-configuration.nix` for the target host;
- replace the example secrets file with real encrypted material;
- choose the real `site domain` for this deployment;
- decide whether the private DNS / CA / ingress pilot path should be enabled now or later;
- adapt domains, addresses, and local policy.

## Private Path Notes

The profile wires the shared naming and secret-delivery contract first:
- `void.site.domain`
- `void.network.dns.mode`
- `void.network.tls.mode`
- `rauthy.env` materialized via the optional `sops-nix` baseline shipped by `void-core`

The private DNS / CA / ingress path remains opt-in until the client repo provides:
- a real private zone file under `dns/`;
- a real root CA certificate under `ca/`;
- a real `step-ca.json` entry inside the encrypted SOPS file.
