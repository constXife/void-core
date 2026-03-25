# Distribution Baseline

## Purpose

This document defines the baseline distribution posture of `void-core`.

## Baseline

`void-core` is distributed as a self-hosted, NixOS-first foundation layer.

The expected model is:
- public source;
- locked flake inputs for reproducible builds;
- declarative configuration;
- reference profiles that can be composed by downstream layers.

The private self-hosted baseline is expected to support:
- human-friendly private service names;
- client-owned DNS delivery;
- host-based ingress for internal web endpoints;
- private CA based HTTPS without a hidden SaaS dependency.

## Relationship To Other Repositories

- `void-core` is the public foundation repository.
- Higher-level product and distribution layers may depend on `void-core`.
- Client deployment repositories may compose `void-core` with additional layers when needed.

`void-core` must not depend on downstream product repositories.
