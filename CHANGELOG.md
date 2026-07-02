# Changelog

## 0.1.0 - Runtime/API Baseline

`backpack-game-core` is still consumed from Git/submodule checkouts rather than
from a published registry package. Treat the commit SHA as the release identity
until package publishing starts.

### Runtime/API baseline

`d5fb481` is the first typed runtime/API baseline. Later documentation-only
commits may be consumed by game submodule pointers without changing the exported
runtime mechanics.

- `d5fb481` - Add TypeScript declarations for the root export and every subpath
  export, plus package export metadata.
- `13e6e0c` - Add reusable numeric-seed RNG helpers, integer rolls, and seeded
  shuffle.
- `d884410` - Add provider-driven flat-grid and bag-aware loadout validation.
- `b9879bd` - Add hookable 1v1 battle simulation.
- `4056d7a` - Add provider-driven backpack loadout generation.
- `6be48a9` - Add deterministic shop offer generation.
- `fdbad4b` - Add adjacent fusion matching.
- `92a39d5` - Add grid footprint and cell-set helpers.
- `69666c8` - Add bag shape masks, rotation, dimensions, and shape-cell helpers.

### Package contract

- Runtime source is ESM JavaScript.
- Type declarations are shipped from `src/*.d.ts`.
- Product games own catalogs, persistence, payment/wallet state, asset
  ownership, UI, and game-specific policy.
- Core helpers stay pure and receive product data through plain objects and
  provider hooks.
