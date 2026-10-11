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

Initial analysis reproduced descendant lostpointercapture clearing an active draft; pending outside release can retain pointer and reject the next pointerdown. Browser confirmation pending. All workstreams pending implementation.
