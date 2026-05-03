# Public Scope

This document defines the explicit public scope of `void-core`.

Its purpose is to prevent two different failures:
- client data leaking into the public foundation;
- product-specific code leaking into the public foundation.

## Rule

If a component, source tree, or document cannot be explained as part of the public
foundation promise and cannot be pointed to by the canonical `void-core` docs,
it should not live in `void-core`.

Public scope must be explicit, not assumed.

Important clarification:
- `shared` does not automatically mean `void-core`;
- both `void-core` and downstream product repositories may contain reusable capabilities;
- the boundary is defined by the public/open foundation promise, not by abstract "sharedness" alone.

## What may live in `void-core`

`void-core` may contain:
- reusable foundation modules and packages;
- public contracts and extension seams;
- shared domain-neutral data contracts when they act as reusable substrate across multiple downstream products;
- the Atrium foundation shell baseline;
- reference profiles and examples;
- foundation documentation needed to explain the public trust and distribution model.

A reusable capability may still stay in a downstream repository if it belongs to a closed product/distribution contour rather than the public foundation baseline.

## Extension model

The intended extension model is:
- foundation primitives in `void-core`;
- higher-level product and distribution layers in separate repositories;
- client-specific overlays in separate deployment repositories.

A downstream product repository may still own shared reusable capabilities when they are not part of the public foundation baseline.

## What must not live in `void-core`

`void-core` must not contain:
- client secrets;
- client inventory or deployment topology;
- client-specific overlays or runtime state;
- private or closed product code;
- product-host implementations that belong to downstream product repositories;
- vertical domain behavior that is not part of the reusable foundation promise.

## Atrium-specific interpretation

`Atrium` may live in `void-core` as a foundation shell.

That includes:
- shell/navigation behavior;
- auth/session-aware entry behavior;
- reusable layouts and presentation primitives;
- build and packaging assets needed to ship the shell.

For Atrium specifically, "ship the shell" means more than publishing UI source:
- `void-core` should remain sufficient to obtain a working baseline `Atrium`;
- if a host/runtime path is required for the foundation shell to function, that path belongs in `void-core`;
- downstream host delegation may exist as an explicit compatibility seam, but it must not be the default baseline runtime.

That does not include:
- downstream product-specific routes;
- downstream product-specific host UIs such as calendar, inventory, or finance surfaces;
- product-specific backend handlers that exist only to serve one downstream product host.

Those belong in downstream product repositories.

## Change discipline

When new code is proposed for `void-core`, the change should answer:
1. Which canonical foundation document describes why this belongs here?
2. Is it reusable outside one downstream product?
3. Does publishing it strengthen trust, inspectability, or portability?
4. Would keeping it here blur the line between foundation shell and product behavior?
5. Do we want to publish it as part of the open and free foundation baseline?

If the answer to the first question is weak, the scope is not explicit enough yet.

## Extension and seam rules

`void-core` should prefer:
- clear contracts;
- small composable modules;
- declarative overlays;
- reusable reference profiles.

It should avoid forcing clients to fork the whole foundation just to express local configuration.

If two or more downstream products need the same neutral reference contract,
`void-core` should prefer one explicit public seam over multiple private ad-hoc variants when that seam is intended to be part of the public foundation baseline.

## Shared data-contract interpretation

Not every domain concept belongs in `void-core`.
But a downstream repository should not be forced to invent its own private contract
for a reusable foundation seam just because the first product need appeared in one place.

Examples of contracts that may belong in `void-core`:
- neutral identity and attachment seams;
- reusable storage and location references;
- reusable merchant or counterparty references when they are needed by more than one downstream product;
- observation metadata seams that improve inspectability and portability across products.

Examples of behavior that should stay downstream:
- product-specific aggregation rules;
- inventory-specific price-summary UX;
- finance-specific dashboards;
- travel-specific workflows and opinionated screens.

A useful rule of thumb:
- if the change defines a reusable reference or contract that multiple downstream products should share and publish as part of the foundation baseline, it is a candidate for `void-core`;
- if the change is shared but belongs to a closed product/distribution contour, it may stay in a downstream product repository;
- if the change defines how one product interprets, aggregates, or presents that contract, it stays in the downstream product repository.
