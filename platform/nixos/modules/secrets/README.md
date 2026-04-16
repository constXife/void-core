# Secrets Modules

This directory contains foundation-level secrets handling modules.

The first-wave baseline is:
- bootstrap secrets materialized as files;
- runtime secrets available under `/run/secrets`;
- an optional `sops-nix` reference path for declarative materialization of those files.
