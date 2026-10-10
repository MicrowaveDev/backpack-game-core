# Shared backpack interaction contract

Mushroom Battles and Meat Master consume one preparation interaction controller
through `@microwavedev/backpack-game-core/vue/composables`.

## Data and ownership

`createBackpackInteraction` receives a caller-owned reactive state created by
`createBackpackInteractionState`, canonical loadout rows, catalog lookup, board
dimensions, save callback, and product policy/feedback callbacks. Row instance IDs
identify duplicates independently. Negative coordinates represent Storage.

Core owns pointer lifecycle, cell grab offset, selection, placement, rotation,
coverage/overlap feedback, cancellation and submission serialization. Consumers
own API persistence, translations, art, sound/haptics, tutorial events and sale
policy. `canInteract` blocks interaction during other preparation mutations.
Consumers must also block their own mutations while `commitRows` is pending.

`commitRows` resolves only after persistence completes; false/null or rejection
means failure. An adapter with optimistic state must restore its previous buckets
on failure and apply server-confirmed rows on success. Feedback callbacks run
after a successful save and cannot undo it. Disposal prevents late UI feedback.

## Inputs and actions

- A click/tap selects an item; a cell click/tap places it. It does not unplace it.
- Pointer drag starts after a movement threshold and preserves the grabbed cell.
  Preview and commit use the same origin. Native drag is disabled on this path.
- `BackpackInteractionControls` offers rotate, Storage, auto-place, cancel, and
  optional sale through the consumer's `onSell` callback. Pointer sale and Storage
  destinations use these same actions. Sale availability remains product-owned.
- Bag mode selects bags on the board. Chips provide an additional selection
  path. Fixed bags are rejected with `locked` feedback.
- Moving a bag preserves item coordinates. Coverage loss blocks the operation;
  core does not guess which bag owns an item spanning multiple bags.
- Escape cancels selection. Capture loss, pointer cancellation, blur, release
  outside a valid destination, and detach clear the drag without saving.

## Validation and feedback

`evaluateBackpackPlacement` uses actual rotated bag masks and the union of all
active bag cells. An item may span adjacent bags if every occupied cell is covered.
Results contain the proposed row, footprint, conflicting `x:y` cell keys, reason
code, and candidate rows. On rejection the original rows remain intact.

Reason codes are `occupied`, `uncovered`, `out_of_bounds`, `bag_contents`,
`locked`, and `unknown_item`. The controller additionally reports `no_space` and
`save_failed`. Consumers localize codes; raw codes are not user-facing copy.

Conflicting cells receive hatching as well as color. Short text appears in the
controls outside the board, without a popup, and is announced as a polite status.
A pointer hover previews the selected item; an invalid drop retains selection for
correction. Known-invalid geometry is not sent to the API; server validation still
protects authoritative state.

`projectLoadoutItems(..., { preserveOrientation: true })` retains dimensions and
quarter turns for Storage and placed items. Its default output remains compatible
with legacy consumers. Artifact figure presentation accepts `rotation`, keeping
shaped bag masks and bitmaps aligned with placement geometry.

## Device acceptance handoff

Automated pointer/touch and layout checks do not establish real Telegram WebView
coverage. The user has agreed to perform iOS/Android device verification:

1. Buy an item; tap it in Storage, then tap a free Backpack cell. Tap the placed
   item again: it should select and remain in place.
2. Drag a multi-cell item by its far cell. The footprint must follow that grabbed
   cell and match the final position, including across adjacent bag boundaries.
3. Drop over occupied/uncovered cells. Check the exact conflicting cells and
   short reason, no popup, and an unchanged confirmed layout.
4. Enter bag mode; move a bag directly on the board. A move that uncovers items
   must be blocked. Move those items first and retry.
5. Rotate, move to Storage, cancel, and reload. Confirm orientation and position
   persist. In Mushroom also sell a selected item and confirm coins and persistence.
6. Scroll around the board, interrupt a drag, switch away and return. There must
   be no stuck preview, accidental action, clipped controls or duplicate saves.

Record device, OS, Telegram version, game, and failing step when reporting an
issue. Real-device acceptance remains pending until those results are supplied.
