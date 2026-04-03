# Storage Modules

This directory contains foundation-level object and blob storage modules.

The first scaffolded storage module is:
- `garage.nix` — a minimal Garage baseline for S3-compatible object storage.

It intentionally stops at:
- a single-node or explicitly-configured Garage baseline;
- safe secret delivery through runtime files rather than embedding sensitive tokens in the Nix store;
- a reusable service contract under the `void.storage` namespace;
- declarative provisioning for baseline buckets, service accounts, and grants without forcing clients to copy shell scripts.

It does not attempt to own:
- per-user runtime bucket lifecycle;
- media-processing pipelines;
- CDN, public edge delivery, or multi-node cluster automation.
