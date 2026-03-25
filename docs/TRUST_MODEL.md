# Trust Model

## Purpose

This document defines the minimal trust posture of `void-core`.

## Baseline

`void-core` is intended to strengthen:
- auditability;
- portability;
- client ownership;
- offline and degraded usefulness of a self-hosted system.

## Non-Goals

`void-core` should not become:
- a hidden SaaS control plane;
- a place for client-specific runtime state;
- a dumping ground for closed product behavior.

## Ownership Boundary

`void-core` provides reusable foundation building blocks.

It does not own:
- client secrets;
- client host inventory;
- client-specific overlays;
- domain-specific vertical product logic.
