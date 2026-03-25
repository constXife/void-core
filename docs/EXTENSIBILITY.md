# Extensibility

## Purpose

This document describes how `void-core` is expected to be extended.

## Extension Model

The intended model is:
- foundation primitives in `void-core`;
- higher-level product and distribution layers in separate repositories;
- client-specific overlays in separate deployment repositories.

## Design Rule

`void-core` should prefer:
- clear contracts;
- small composable modules;
- declarative overlays;
- reusable reference profiles.

It should avoid forcing clients to fork the whole foundation just to express local configuration.
