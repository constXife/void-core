# Secrets Modules

This directory contains foundation-level secrets handling modules.

The first-wave baseline is:
- bootstrap secrets materialized as files;
- runtime secrets available under `/run/secrets`;
- optional `sops-nix` integration for declarative secret delivery.
