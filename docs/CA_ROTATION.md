# CA Rotation

This document defines the canonical PKI rotation model for `void-core`.

## Canonical Model

- The root certificate is the trust anchor for clients.
- The intermediate certificate/key lives online in `step-ca` and signs leaf certificates.
- Clients are expected to trust `root_ca.crt`, not the intermediate certificate.
- Intermediate rotation is a routine operational capability.
- Root rotation is a rare staged migration, not routine maintenance.

## Intermediate Rotation

Use this path when you need to refresh the signing chain without changing the
trust anchor.

What changes:

- a new intermediate is issued by the current root;
- `step-ca` starts issuing new leaf certificates from the new intermediate;
- client trust stores do not need to change.

What users should not need to do:

- reinstall the root certificate;
- change trust stores manually;
- reissue every leaf certificate at once.

Expected behavior:

- existing leaf certificates continue to work until their normal renew / reissue;
- new leaf certificates are issued from the new intermediate;
- services rotate certificates through the normal issuance path.

Operational requirements:

- do not pin intermediate certificates on clients;
- keep the client trust anchor root-only;
- verify issuance of a new leaf certificate and its chain after rotation.

## Root Rotation

Use this path only when the trust anchor itself must change.

What changes:

- a new root is issued;
- the new root must be distributed to clients before issuance switches over;
- only after an overlap period should the CA move to the new root chain.

Recommended staged sequence:

1. Issue a new root.
2. Start distributing the new bootstrap bundle via `ca.<domain>`.
3. Install the new root on client trust stores in parallel with the old root.
4. Switch CA issuance to the new chain.
5. Remove the old root after the migration window closes.

What not to do:

- do not replace the root in a single step without an overlap period;
- do not assume leaf renew alone is enough to migrate trust anchors;
- do not treat root rotation as ordinary maintenance.

## Bootstrap Distribution

The canonical client-owned bootstrap path is:

- `http://ca.<domain>/`
- `https://ca.<domain>/`

Both endpoints should publish:

- `root_ca.crt`
- `root_ca.der`
- `root_ca.sha256`
- a landing page with installation instructions

Recommended UX:

1. Download `root_ca.crt` or `root_ca.der`.
2. Verify the SHA-256 / fingerprint out-of-band.
3. Install the certificate into the client trust store.
4. Use `https://ca.<domain>` and the rest of the private endpoints afterwards.
