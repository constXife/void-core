# Platform Header Contract

This directory contains reusable frontend header primitives for `Atrium` and later
product surfaces built on the same shell vocabulary.

The split is intentional:

- foundation primitives live here in `src/platform/components`;
- product-specific assembly lives outside this directory;
- `Atrium` consumes the same contract instead of defining a separate canonical header stack.

## Purpose

These primitives exist to avoid two bad outcomes:

- copying header/dropdown logic into each product surface;
- pushing product-specific state and business logic into generic platform components.

The contract is composition-first:

- a frame defines `left / center / right`;
- dropdown behavior is reusable and state-agnostic;
- product wrappers decide what to render in each zone.

## Foundation Components

- `PlatformHeaderFrame.vue`
  Structural shell for header layout.
  Supports:
  - `variant="overlay"` for floating shell headers;
  - `variant="bar"` for sticky product bars.

- `PlatformHeaderBrand.vue`
  Reusable product/space brand block.
  Supports:
  - `variant="glass"` for elevated shell branding;
  - `variant="flat"` for neutral bar-style headers.

- `PlatformAppsMenu.vue`
  Shared applications switcher.
  Resolves links from either:
  - explicit `domain`;
  - current browser host as fallback.

- `PlatformDropdownAnchor.vue`
  Generic trigger/panel anchor with outside-click handling.
  This is the default primitive for user menus and future bounded dropdowns.

- `PlatformUserMenuTrigger.vue`
  Shared avatar-based trigger for user menus.

- `PlatformUserDropdownPanel.vue`
  Generic panel used by the platform-level user dropdown flow.

## Current Consumers

- `src/components/TheHeader.vue`
  Product-specific `Atrium` shell header.
  Uses:
  - `PlatformHeaderFrame`;
  - `PlatformHeaderBrand`;
  - `PlatformAppsMenu`;
  - `PlatformDropdownAnchor`;
  - `PlatformUserMenuTrigger`.

- `src/components/AtriumSpaceSwitcher.vue`
  `Atrium`-specific center content for the shell header.
  This stays outside foundation because it depends on `Atrium` space/runtime state.

- `PlatformHeader.vue`
  Secondary generic consumer of the same primitives for bar-style headers.

- `UserDropdown.vue`
  Secondary generic consumer for anchor + trigger + dropdown panel composition.

## Rules

- Do not move product-specific store logic into platform primitives.
- Do not add one giant header component with many product flags.
- Prefer extracting small structural primitives over introducing parallel wrappers.
- If a new product needs a different center section, create a product component for it rather than growing `PlatformHeaderFrame`.
- If a new capability is reusable across products, add it here and migrate existing consumers to it.

## Recommended Assembly

```vue
<PlatformHeaderFrame>
  <template #left>
    <PlatformHeaderBrand />
  </template>

  <template #center>
    <ProductSpecificCenter />
  </template>

  <template #right>
    <PlatformAppsMenu />
    <PlatformDropdownAnchor>
      <template #trigger>
        <PlatformUserMenuTrigger />
      </template>
      <template #dropdown>
        <ProductSpecificUserDropdown />
      </template>
    </PlatformDropdownAnchor>
  </template>
</PlatformHeaderFrame>
```

That pattern is the current canonical path for header composition in this app.
