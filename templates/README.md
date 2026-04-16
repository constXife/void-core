# Templates

This directory contains reusable templates for downstream consumption.

The initial focus is:
- a minimal client deployment template for `default`.

That template now includes:
- a vendor-shipped seed for baseline service configuration;
- the shared site-domain contract;
- one canonical encrypted secret shape example under `secrets/core-01.yaml.example`;
- opt-in placeholders for the private DNS / CA / ingress path.
