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

## What may live in `void-core`

`void-core` may contain:
- reusable foundation modules and packages;
- public contracts and extension seams;
- the Atrium foundation shell baseline;
- reference profiles and examples;
- foundation documentation needed to explain the public trust and distribution model.

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

That does not include:
- downstream product-specific routes;
- downstream product-specific host UIs such as calendar, inventory, or finance surfaces;
- product-specific backend handlers that exist only to serve one downstream product host.

Those belong in downstream product repositories such as `void`.

## Change discipline

When new code is proposed for `void-core`, the change should answer:
1. Which canonical foundation document describes why this belongs here?
2. Is it reusable outside one downstream product?
3. Does publishing it strengthen trust, inspectability, or portability?
4. Would keeping it here blur the line between foundation shell and product behavior?

If the answer to the first question is weak, the scope is not explicit enough yet.
