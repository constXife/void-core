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

## Ownership boundary

`void-core` provides reusable foundation building blocks.

It does not own:
- client secrets;
- client host inventory;
- client-specific overlays;
- client runtime data;
- domain-specific product logic;
- downstream product-host code.
