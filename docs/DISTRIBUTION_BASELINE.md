# Distribution Baseline

This document defines the baseline distribution model of `void-core`.

## Baseline

`void-core` is a self-hosted, NixOS-first foundation layer.

The expected model is:
- public source;
- locked flake inputs for reproducible builds;
- declarative configuration;
- reference profiles that downstream layers can compose.

The private self-hosted baseline should support:
- human-friendly private service names;
- client-owned DNS delivery;
- host-based ingress for internal web endpoints;
- private CA based HTTPS without a hidden SaaS dependency.

## Relationship to other repositories

- `void-core` is the public foundation repository.
- Higher-level product or distribution repositories may depend on `void-core`.
- Client-owned deployment repositories may compose `void-core` with additional layers.

`void-core` must not depend on downstream product repositories.
