# Ingress Modules

This directory contains foundation-level ingress modules.

The first scaffolded ingress module is:
- `caddy.nix` — a narrow reverse-proxy baseline for `id.<site-domain>` and `ca.<site-domain>`.

The intent is to establish one canonical private ingress path first.

It does not try to cover:
- every future service entry pattern;
- arbitrary multi-site reverse-proxy composition;
- router or DNS automation;
- public edge hosting conventions.
