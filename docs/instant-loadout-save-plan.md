# Immediate loadout placement

## Contents

- Request and scope
- Implementation
- Verification and delivery

## Request and scope

User reported a visible drag delay and sequential loadout/bootstrap requests, supplied complete response examples, then authorized implementation. Tracking issue: #19. Scope is the configured gameplay loadout save path; other mutation lifecycle refreshes stay intact. Mushroom already projects rows optimistically and uses one normal save request.

## Implementation

Render a transient run with proposed loadout rows before awaiting the save, using the previous authoritative revision. Keep the existing mutation gate while pending. Clear placement preview on commit so it does not linger over the optimistic placement. Confirm the complete server run into screen and matching controller snapshots without bootstrap.

On failure, restore the prior run and report the error. Only409 conflicts reload bootstrap; recovery may clear a run ended elsewhere. Guard confirmation, rollback and recovery against disposal and run changes. Do not enqueue unconfirmed edits or retry purchases/mutations implicitly.

Workstreams: primary owns core implementation/unit tests/pins/delivery; delegated browser owner writes only Meat's browser regression and new QA evidence. Core first, then consumer pins; no Mushroom behavioral rewrite.

## Verification and delivery

Core deferred-response checks cover immediate rows, authoritative normalization/revision, no duplicate mutation, rollback, conflict-only recovery, run change/disposal, Vue reactive wrapping and ended-run recovery. Meat real-API browser test holds a response explicitly, checks the new location before confirmation and zero bootstrap, checks next-save revision, rejects a save and verifies rollback, then reloads persisted placement.

Core510 tests and Meat14 browser journeys passed; Meat production build passed. New evidence is committed under Meat docs/qa/backpack-interaction/instant-loadout-save/. The held-response capture proves placement before confirmation with no pending preview or bootstrap. Two older browser mocks required success:true envelopes; bootstrap had previously masked their malformed replies. No timing assertions were weakened. Mushroom pointer/build validation follows core push. Deliver core and Meat PRs; Mushroom pointer on main. No deployment before user merge/update request.
