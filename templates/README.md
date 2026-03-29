# Templates

This directory contains reusable templates for downstream consumption.

The initial focus is:
- a minimal client deployment template for `default`.

That template now includes:
- a vendor-shipped seed for baseline service configuration;
- the shared site-domain contract;
- a runtime secret materialization example for `rauthy.env`;
- opt-in placeholders for the private DNS / CA / ingress path.
