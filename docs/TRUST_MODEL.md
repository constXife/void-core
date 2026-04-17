# Trust Model

This document defines the trust boundary of `void-core`.

## What `void-core` should strengthen

`void-core` should make a self-hosted system more:
- auditable;
- portable;
- client-owned;
- useful in offline or degraded conditions.

## What `void-core` must not become

`void-core` must not become:
- a hidden SaaS control plane;
- a home for client-specific runtime state;
- a place where closed or downstream product behavior leaks into the public foundation.

## Distribution posture

`void-core` is a self-hosted, NixOS-first foundation layer.

The expected baseline is:
- public source;
- locked flake inputs for reproducible builds;
- declarative configuration;
- reference profiles that downstream layers can compose.

The private self-hosted baseline should support:
- human-friendly private service names;
- client-owned DNS delivery;
- host-based ingress for internal web endpoints;
- private CA based HTTPS without a hidden SaaS dependency.

## Canonical and secondary paths

The canonical deployment and integration model of `void-core` is Nix/NixOS-first.

That means:
- NixOS modules and flake outputs define the canonical deployment posture;
- reference profiles and client-owned deployment repositories are expected to compose the foundation through Nix;
- other packaging paths may exist later as secondary convenience or app-packaging layers.

Those secondary paths must not redefine the public foundation model.
They may help people evaluate or package one application, but they are not the source of truth for the baseline distribution posture of `void-core`.

## Ownership boundary

`void-core` provides reusable foundation building blocks.

It does not own:
- client secrets;
- client host inventory;
- client-specific overlays;
- client runtime data;
- domain-specific product logic;
- downstream product-host code.

Higher-level product or distribution repositories may depend on `void-core`.
Client-owned deployment repositories may compose `void-core` with additional layers.
`void-core` itself must not depend on downstream product repositories.
