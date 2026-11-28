# Whole-home natural expiry and native retirement (ED-29)

The whole-home driver now activates the physical expiry mechanism for actual captured SDK body profiles. `observePaidHomeBodies` captures ordinary salvage/decay profiles; `observePaidHomeControl` retains the complete native `units/creeps` owner alongside assignments/reservations. Private control seeding copies that owner even when a diagnostic only seeds physical inventory. Normalization binds each supplied profile to its original native ID, actual observed TTL and forecast-local tombstone ID; initial global roster/body identity, bounds and restored immutable lifetime metadata must agree.

## Physical and controller phases

The driver requires an explicit complete modeled owned roster whenever lifetimes are active. It does not indefinitely replay the opening roster. The ordinary native `createTickAdmission`, `createCreepMaintenance`, hauling settlement and logistics retirement owners run before optional actor work. Last-frame transfer events settle before task/claim retirement and journal archival. Missing dead-body cargo is omitted from the observation, matching native SDK behavior; current room visibility controls event evidence. The receipt collector observes newly confirmed productive deliveries before their journals are archived, without another physical deposit or future repeated credit. Unknown evidence remains uncertain, not inferred from bank stock.

Accepted transit end positions feed physical expiry. Dead bodies leave active pose/store/traffic registries and paid route cursors; schedules cannot visit them or retain them as outside obstacles. Original route programs and body recipes remain in checkpoint input. Restore permits only physically declared deaths to remove active rows/programs and validates lifecycle metadata, corpse bindings, live poses and archived identity evidence. A checkpoint immediately before postmortem confirmation resumes through the same single receipt and archival state.

The native20-retirement limit is retained. If maintenance has more work, owned actor/fleet work is paused while physical object ticks continue. Explicitly independent external operations and foreign movement remain independent of our admission gate. The saved global roster retains pending retirements for the next tick; it is not replaced by a freshly seeded roster. A completed corpse can therefore be physically absent before its controller cleanup is admitted. The private record allowance is198 envelopes:64 selected task/journal/uncertainty triples plus six shared/retirement owners. Native archives retain their existing50-entry bound and discard count.

Unprofiled and spawning bodies retain the explicit lifecycle guard. A new identity under a known dead name requires a prospective-body transition; it cannot resurrect the old worker. The roster observer is bounded at512 global owned identities and does not claim unseen bodies are alive or dead without a modeled provider.

## Incremental integration evidence

Five new whole-home cases prove:

- A courier's final32-energy delivery confirms after death, archives once, clears tasks/claims and survives immediate JSON continuation without re-emitting income.
- Corpse32 stock appears at the accepted final movement pose, with no bank credit; changed lifetime metadata refuses restore.
- A miner's final harvest leaves50 in its actual station container; native retirement releases its station scope and a subsequent scheduled visit refuses.
- Twenty-one simultaneous deaths retire20, pause owned work while allowing declared independent work, and resume the remaining identity exactly across JSON continuation.
- Lost postmortem room-event visibility retains physical32 bank stock but archives uncertainty with no receipt or invented cargo observation.

The supporting original hauling/checkpoint/body capture/assignment/mining tests continue to exercise unprofiled compatibility. The native unit lifecycle, retirement archive and tick-admission tests guard the reused owners. Final affected units:62 tests/11 files1.03s. Pinned expiry/transfer comparisons:13 tests/2 files315ms. Fixed smoke:76 tests/15 files526ms (unchanged selection). Typecheck, lint, boundaries and Lizard pass (1216 production/986 test files, zero violations), as does the CommonJS/no-Node-globals bundle check. Full units and exact-source closure CI were not run for this incremental step. Clean native evidence follows below.

## Remaining gates

This qualifies ordinary natural expiry for the seeded remote cohort and supplied physical world, not the complete future financial/native actor calendar. Household labor/scout control and their extra retirement hooks/state are not composed by this private adapter. Prospective births/spawning, damage/combat, recycling/suicide, multi-resource cargo, native bank-task openings, complete current environment and replacement ownership still require integration. The existing productive courier opening resolver may still explicitly refuse ambiguous surviving-courier evidence; do not bypass that qualification boundary or mint a receipt. Full dispatch/horizon/CPU, parity, pressure, migration/rollback and RC gates remain open. Full units/closure CI remain required before ticket closure. No live deployment.

## Clean native evidence

Both scenarios passed on clean published runtime source `9eb6e29470a2471ec42453523476962e59462d9d` with no reported errors:

- `node tools/engine/smoke.cjs --final-delivery`: `engine-swfM1a`, four native ticks. The versioned harness asserts the alive-tick30 deposit is confirmed after natural death, appears as one30 receipt, leaves task/quantity claims empty and archives the acknowledged observed30 journal. Detailed trace assertions are in `tools/engine/final-delivery.cjs`; this report retains passed status/provenance rather than exporting that memory trace separately. This independently verifies the native before-retirement order reused by the private driver.
- `node tools/engine/smoke.cjs --remote-pipeline-configured --external-pipeline-telemetry`: `engine-WxJCqe`, supported1000 ticks. All existing receipt/route/control gates remain enabled. Six snapshots150..155 capture ordinary expiry profiles for all six bodies, salvage0 and tombstone decay15/5/15/35/20/20, plus a six-unit global owned roster. Every private seed's unit roster exactly equals the native control snapshot. Local fixture telemetry only.

Exact source, deterministic raw archives and hashes: `evidence/startup-home-expiry.json`. The supported pipeline captures/seeds these facts; it does not execute the new whole-home private future dispatcher as a complete native financial forecast. Native spawning, household hooks, full current environment and all remaining milestone gates remain unqualified.


## Restored uncertainty evidence

Closed-frame restore now validates selected couriers' and miners' uncertainty records independently of their current tasks. The native uncertainty schema retains its ten-entry bound and discarded counter. Each incident must name the expected native body and home, have an observation timestamp before the next frame, and bind its attempt to the archived request's actual home/request key, target and resource. Retired archives use the same transfer-binding/clock checks; their global entries may legitimately belong to other homes, so their own recorded home is validated against their request key rather than forcibly rewritten to this home's identity. Initial-boundary checkpoints receive these checks too.

This closes a restore-validation gap: private state envelopes alone did not decode surviving courier incident data, and miner/retirement validation checked fewer relationships. Historical unknown transfers remain uncertain; this change does not reconstruct receipts or qualify surviving-courier cleanup, arbitrary recovery routes or the complete financial calendar.

Verification: `paid-home-uncertainty-checkpoint`, `paid-home-expiry`, `paid-mining-banking` and `paid-hauling-checkpoint` pass (24 tests/4 files,973ms). One new behavior test covers live courier history plus a naturally archived miner transfer, valid detached JSON continuation and rejection of altered home/body/target/request/clock/schema. The existing postmortem uncertainty test now checks valid resume and rejects a changed archived request binding. Fixed smoke remains76 tests/15 files (594ms). Typecheck, lint, boundaries, Lizard (1218 production/987 test files, zero violations), packaged build and whitespace checks pass. Full units and closure CI were not run for this incremental change.
