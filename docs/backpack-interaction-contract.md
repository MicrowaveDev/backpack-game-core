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
- A drag from an empty usable bag cell selects that bag after the threshold.
  Occupied cells prefer items; shape holes cannot grab the bag. Bag labels provide
  keyboard/tap selection even when every usable cell is filled. Fixed bags remain locked.
- Translating a placed bag atomically returns every item intersecting its old
  usable mask to Storage. A seam item moves whole, once by instance ID. Preview
  highlights affected items and announces their count. Same-position/same-rotation
  drops do not evacuate or save. Rotation/removal retain coverage validation.
- Idle controls are hidden in a stable compact rail. Selection reveals ↻/⋯;
  Storage, auto-place, sale and cancel live in the context menu. During drag a
  distinct sale zone displays the injected refund before release. `R` rotates
  a draft under the pointer without saving; Escape cancels. Storage and sale
  destinations use `data-backpack-drop-zone` with `storage` / `sell` values.
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
4. Drag a bag by an empty usable cell. Preview identifies its affected items;
   a successful move returns them to Storage together. Cancel and invalid drops
   leave everything unchanged. Fill a bag and select its label to move via tap.
5. Rotate, move to Storage, cancel, and reload. Confirm orientation and position
   persist. Also sell a selected item and confirm coins and persistence in both games.
6. Scroll around the board, interrupt a drag, switch away and return. There must
   be no stuck preview, accidental action, clipped controls or duplicate saves.

Record device, OS, Telegram version, game, and failing step when reporting an
issue. Real-device acceptance remains pending until those results are supplied.

## Pointer-following artifact visual

After the drag threshold, `state.dragVisual` tracks viewport position and the
exact pixel grab offset. The inventory board teleports the consumer's existing
artifact renderer to a fixed, non-interactive overlay. Both artifacts and bags
retain their canonical orientation and grid size. This freely moving art is
separate from snapped destination/conflict cells. Drop, cancellation, capture
loss, blur and detach remove the visual without changing the page layout.

## Persistence validation

`normalizeBackpackBagMoves` derives affected instance IDs from authoritative old
rows and final proposed bag anchors. Products call it inside their transaction,
then validate and save the complete normalized snapshot once. This also handles
clients which omit evacuation. IDs, dimensions and rotations survive Storage.
Mushroom supplies `getBackpackLoadoutRevision` as `loadoutRevision`; the server
checks it inside the run lock and reloads are required after a 409. Meat retains
its integer snapshot revision. A failed write never exposes a partial evacuation.
