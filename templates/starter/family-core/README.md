# family-core Starter Default

This directory contains a copy-oriented starter baseline for `family-core`.

It is intended to be used as a seed:
- the operator copies the files into a client-owned deployment repository;
- replaces placeholder values with deployment-specific data;
- extends or trims the baseline to fit the client environment.

Current starter material:
- `rauthy.toml.template` — starter Rauthy config template with placeholder values
- `rauthy.env.example` — starter runtime env file shape for the auth baseline
- `step-ca.json.template` — starter step-ca config shape for the private CA baseline

This is not client-owned state and not a complete deployment assembly.
It is a vendor-shipped default intended to accelerate the first setup of a `family-core` deployment.
