# Rotation before placement

A placed row can rotate without clearance at its current anchor. If the new orientation fits, it saves in place as before. Otherwise the interaction keeps a local rotation draft and shows its cell conflicts. Rotate again, choose Move and tap a destination, drag the original bag, or use Auto-place. Only a valid final placement saves.

The confirmed layout stays intact until placement. Escape, outside dismissal, selecting another row, or detaching discards the draft. A failed tap placement save retains the draft for retry. Locked starter bags remain locked. Moving a rotated bag to another anchor retains the existing evacuation of its original contents to Storage; in-place rotation retains existing coverage checks.

Implementation is shared by the configured Meat screen and the Mushroom adapter through `vue/composables`. No API or persistence schema changes are needed.

Verification: core interaction tests cover collision, edge overflow, contents, draft dragging, repeated rotation, reactive selection, cancellation, and save rejection. Consumer browser evidence covers desktop and touch rotation at an edge followed by a single valid save.
