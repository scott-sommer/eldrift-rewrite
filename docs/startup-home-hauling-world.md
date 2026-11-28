# Private home hauling world

ED-29 remains in progress. `app/remotes/startup/hauling-state/world/driver.ts` now composes the canonical home inventory, isolated task/request/journal/quantity state, actual productive transport policy, fixed activated routes and common traffic solver. The native home observation packet satisfies its narrower input contract. No live action ports or game globals are used.

## Frame ownership

The caller supplies a consecutive tick, explicit actor operations and outside movement facts. Each frame first reads current task/physical openings for route observation. Exactly one fleet settlement operation is required before any paid productive visit; outside controllers can run at their declared positions in that sequence. Omitted paid visits do not omit settlement. All actors share quantity reservations, action ownership and the frozen physical inventory. Movement resolves after operations, then transfers settle in an explicit caller-provided processor order. The driver never assumes that intent submission order is native processor order.

Endpoint visibility, actual endpoint identity/position/activity, room policy, tile legality, terrain and current authority are explicit injected observations. The selected service tile and range to the actual endpoint must both permit a transfer, matching the native transfer adapter. Source stock is unavailable when the source endpoint is missing or unseen.

All known outside bodies must be supplied as current occupants or transit states at their predicted positions. A fatigued outside body requires a transit state so recovery uses its supplied plan. Missing bodies, changed positions/fatigue and duplicate/paid outside identities invalidate the forecast. Spawn transitions and body expiry currently stop it with a lifecycle error; it does not fabricate activation, keep a dead obstacle, or omit a spawning paid body from traffic.

## Confirmed delivery output

The receipt collector captures unacknowledged delivery attempts immediately before fleet settlement, and reads their acknowledged journal result and posted request receipt immediately afterward, before new work can replace the journal. Only positive actual amounts produce output, with source, planned worker/request identity, issue tick and confirmation tick. Opening receipts already reflected in native inventory are excluded. No unbounded receipt history is maintained. Delivery rows are observations for the future accounting join; they do not themselves credit cash or authorize spending.

Any frame failure invalidates the world, including snapshots. The snapshot remains physical diagnostics only. Use the separate versioned checkpoint API for resumption; reseeding a diagnostic snapshot would lose pending liabilities.

## Checkpoint and resume

`checkpoint()` emits detached format1 JSON only at a closed successful frame boundary. It retains the original validated home packet and policy, current inventory plus next-frame effects (including zero effects), body poses, all private state envelopes, activated route cursors including requested steps, expected next-frame positions/fatigue and clocks. `resumeHomeHaulingWorld` restores these owners directly; it does not normalize original openings, replay receipts, renew leases or reset task queues. The service continuation clock is separate from the original observation clock so historical policy identity remains stable.

Restore checks format/clock agreement, immutable inventory metadata, bounded state/envelope and feature schemas, route programs and transit cursors, body/movement agreement, and the bindings between pending private transfer journals and retained physical effects. Missing pending effects or journals are rejected before a future frame can emit a misleading receipt.

JSON-roundtrip tests resume with fresh environment ports at next ticks100/101/105/106/109/110/112/113, then compare every future frame and the final complete checkpoint through114 against uninterrupted execution. Dedicated checks reject lost task state, pending effects/journals, body/movement disagreement and incompatible clocks. A pending32-energy delivery confirms once at105 and is not credited again after another resume. Checkpoint attempts during an open frame or after failure are rejected.

The environment functions and future actor operations must be supplied again. Stateful outside controllers must persist their owned state through the shared private state port and reopen it on configuration; arbitrary closure variables and external observations are not serialized. Tests prove such state survives, but complete native household/authority/lifecycle controller capture is still future integration work. This checkpoint covers the implemented private hauling driver, not a complete native home financial forecast.

## Verification

The existing physical fixture now uses the production driver rather than handwritten wiring. Independent expectations remain:32 energy settles at105,50 at112, withdrawal is issued108, final body/container/bank energy is0/50/82 (132 total). Confirmed output reports the same source/worker attribution and dates. Coverage includes settlement without productive visits, outside claim reservation/release, actor ordering/action conflicts, missing/teleported outside bodies, body expiry, opening receipt exclusion, invalid schedules, lease renewal/expiry and immutable request deadlines.

- Initial driver selection:seven files/37 tests passed,566ms. Final checkpoint selection:nine files/52 tests passed,743ms (`paid-hauling-checkpoint`, `paid-hauling-world`, `paid-hauling-physical`, `paid-hauling-service`, `paid-hauling-transfer`, `paid-hauling-movement`, `paid-hauling-state`, `paid-home-inventory`, and `energy-inventory` via `npx vitest run` with their file paths).
- `npm run test:smoke`:76 tests/15 files passed,550ms; selection unchanged.
- `npm run quality` (type check, lint, architecture boundaries, pinned Lizard) (1164 production/960 test files, zero violations), and `npm run check:bundle` passed.
- Full units and milestone CI were not run: this is an incremental implementation step, not ticket closure.
- No new native scenario was run for this private driver. Existing native evidence does not qualify its future calendar.

## Remaining integration

Shared physical harvest/overflow/regeneration now exists; see [source physics](startup-source-physics.md). Native source capture and the [shared mining actor/station cycle](startup-shared-mining-cycle.md) now exist. Physical repair now exists; see [repair evidence](startup-physical-repair.md). Implement physical building/container maintenance and current environment/movement/banking providers, native household actor control state and claims, prospective births/spawn exits/TTL/cleanup and actual authority renewal control. Extend the private checkpoint to those controllers as they are added. Supply all actor work and native processor ordering from those models. Reconcile the authoritative material inventory with the existing cash/spawn timeline once: its receipt/accounting paths already credit cash and can deposit energy. Never add these physical deliveries as duplicate passive flows. Multi-source future native receipt calendars, full horizon and strict5ms remain required before financial admission; ED-29 and all later release gates remain open. No deployment was enabled.
