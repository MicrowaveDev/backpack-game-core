# Shop drag purchase and reliable gestures

## Contents

- Requirements
- Workstreams
- Evidence

## Requirements

User: first drag must work reliably; shop artifacts and bags can be dragged directly to Backpack. Display coin cost near a corner of the target cell. Purchase and placement succeed together; rejection/cancellation spends nothing. Existing click purchase remains.

Implementation choices: shared pointer owner, transient shop draft without owned instance ID; price badge below the target cell at its right corner; backend validates geometry and currency inside existing product transaction/store update. No save-then-refund sequence.

## Workstreams

1. Pointer lifecycle (core): ignore descendant lostcapture transfer, terminal events outside root, multi-event touch regression. Owner: primary, analysis by read-only drag_first_attempt.
2. Shop draft/presentation (core): offer source hit test, art, target cost badge, callback contract, tests. Owner primary. Depends on pointer lifecycle.
3. Atomic buy-and-place (core helper and Mushroom port, Meat adapter): validate rows before debit, stale revision protection, configured UI adapters. Core/Mushroom owner primary; Meat product adapter delegated with disjoint writes. Depends on helper contract.
4. Verification/delivery: core then pins, API/browser journeys, dual viewport evidence, self-review, core PR and Meat PR, Mushroom main. Owner primary.

## Evidence

Analysis identified descendant `lostpointercapture` cancelling the first touch drag and a pending pointer surviving release outside the root. Both now have regressions; descendant transfer is ignored while genuine root loss still cancels. Native image dragging is suppressed for these pointer-owned sources.

Implemented shared shop drafts, art, target coin badge, stationary-finger edge autoscroll, and atomic placement adapters. Bag orientation derives from the actual shape rather than legacy catalog dimensions. Rotation immediately refreshes both placement and price validity. Mushroom applies the returned placed loadout immediately, avoiding a temporary Storage row.

Verification completed: core 499 tests and package dry-run; Mushroom 666 game tests, production build, three screen checks, focused real-API desktop/mobile shop drag plus existing Backpack journey (3/3); Meat 120 product tests, 11 browser journeys, build, and hosted/local deployment configuration checks with synthetic values. The initial combined gate found a mobile test coordinate race during ongoing autoscroll; final focused checks stop scrolling with the held finger and reacquire the target, retaining the geometry assertions. No production data or device tests were used.

Visual evidence: Mushroom `.agent/tasks/backpack-ux/raw/shop-price-preview-{desktop,mobile}.png` with JSON metadata; Meat `docs/qa/backpack-interaction/shop-drag-purchase/`. Both viewport captures reviewed: art follows the drag, price remains readable above it near the target corner, no horizontal overflow. Mobile uses actual touch edge scrolling, and release persists placement. Meat also repeats a bag touch drag immediately after the first drop.

Delivery: shared core feature PR, Meat feature PR, Mushroom main integration, then hub Mushroom pointer. Merge order is core before Meat. Deployment follows the user's merge/update request; physical iOS/Android Telegram WebView verification remains with the user.
