# Private home hauling world

ED-29 remains in progress. `app/remotes/startup/hauling-state/world/driver.ts` now composes the canonical home inventory, isolated task/request/journal/quantity state, actual productive transport policy, fixed activated routes and common traffic solver. The native home observation packet satisfies its narrower input contract. No live action ports or game globals are used.

## Frame ownership

The caller supplies a consecutive tick, explicit actor operations and outside movement facts. Each frame first reads current task/physical openings for route observation. Exactly one fleet settlement operation is required before any paid productive visit; outside controllers can run at their declared positions in that sequence. Omitted paid visits do not omit settlement. All actors share quantity reservations, action ownership and the frozen physical inventory. Movement resolves after operations, then transfers settle in an explicit caller-provided processor order. The driver never assumes that intent submission order is native processor order.

Endpoint visibility, actual endpoint identity/position/activity, room policy, tile legality, terrain and current authority are explicit injected observations. The selected service tile and range to the actual endpoint must both permit a transfer, matching the native transfer adapter. Source stock is unavailable when the source endpoint is missing or unseen.

All known outside bodies must be supplied as current occupants or transit states at their predicted positions. A fatigued outside body requires a transit state so recovery uses its supplied plan. Missing bodies, changed positions/fatigue and duplicate/paid outside identities invalidate the forecast. Spawn transitions and body expiry currently stop it with a lifecycle error; it does not fabricate activation, keep a dead obstacle, or omit a spawning paid body from traffic.

## Confirmed delivery output

The receipt collector captures unacknowledged delivery attempts immediately before fleet settlement, and reads their acknowledged journal result and posted request receipt immediately afterward, before new work can replace the journal. Only positive actual amounts produce output, with source, planned worker/request identity, issue tick and confirmation tick. Opening receipts already reflected in native inventory are excluded. No unbounded receipt history is maintained. Delivery rows are observations for the future accounting join; they do not themselves credit cash or authorize spending.

Any frame failure invalidates the world, including snapshots. The snapshot is physical diagnostics only: it is not a resumable checkpoint and cannot be used to reseed task state without losing pending liabilities.

## Verification

The existing physical fixture now uses the production driver rather than handwritten wiring. Independent expectations remain:32 energy settles at105,50 at112, withdrawal is issued108, final body/container/bank energy is0/50/82 (132 total). Confirmed output reports the same source/worker attribution and dates. Coverage includes settlement without productive visits, outside claim reservation/release, actor ordering/action conflicts, missing/teleported outside bodies, body expiry, opening receipt exclusion, invalid schedules, lease renewal/expiry and immutable request deadlines.

- Targeted seven files:37 tests passed,566ms.
- Fixed smoke:76 tests/15 files passed,561ms; selection unchanged.
- Type check, lint, architecture boundaries, pinned Lizard (1161 production/959 test files, zero violations), and packaged bundle passed.
- Full units and milestone CI were not run: this is an incremental implementation step, not ticket closure.
- No new native scenario was run for this private driver. Existing native evidence does not qualify its future calendar.

## Remaining integration

Implement source harvesting/maintenance/regen, native household actor control state and claims, prospective births/spawn exits/TTL/cleanup, full private checkpoint/resume and actual authority renewal control. Supply all actor work and native processor ordering from those models. Reconcile the authoritative material inventory with the existing cash/spawn timeline once: its receipt/accounting paths already credit cash and can deposit energy. Never add these physical deliveries as duplicate passive flows. Multi-source future native receipt calendars, full horizon and strict5ms remain required before financial admission; ED-29 and all later release gates remain open. No deployment was enabled.
