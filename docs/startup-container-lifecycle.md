# Ordered container lifecycle and spill ownership

ED-29 runtime source: `e9b50a543f65ecbe2888e95dabf7422dea86a584`. The shared physical frame now advances container decay, deletes destroyed stores, spills their energy to ground and retains a bounded destruction record. Native capture includes actual SDK countdowns and the current room's recurrence rules. Source construction remains separate work.

## Explicit post-action order

`EnergyPostprocessOrder` supplies a complete permutation of source, existing ground-pile and active-container object operations after all actor intents settle. It receives detached operation identities and cannot read/change an in-progress frame. A world with declared container clocks requires an explicit order; it cannot silently assume native object order from actor submission or SDK iteration. The whole-home frame forwards this callback. This provides the physical mechanism, not yet a qualified future native ordering provider.

The operation list is built once at the start of object processing, including piles created during actor actions. A new pile created by container destruction during that iteration is first decayed on the next frame. A spill into an existing pile interacts with the pile's declared position in the iteration: rounding can produce different results when the pile runs before versus after the container. Harvest overflow still uses its separate pre-object-phase capture/merge semantics.

Container recurrence uses remaining action frames, with native post-decay countdown99 for ordinary rooms and499 for owned-level rooms. The current SDK countdown is retained even if it exceeds the supplied recurrence interval; the next recurrence uses that supplied rule. Due/absent SDK clocks are represented as one action frame. Health repairs run before decay and may save the container that frame. Controller-rule changes themselves still require a modeled transition.

## Deleted objects and checkpoints

A destroyed container is absent from physical inventories and repair/transfer targeting. Its bounded historical record retains destruction tick and spilled energy, with zero health and a finished decay clock. It cannot be repaired back into existence. Restore allows only those declared destroyed stores to be absent, validates immutable geometry/decay rules and death clocks, and retains current health/ground state without replaying the spill.

Previous-frame transfer, harvest and repair effects remain valid witnesses even if their container disappeared in that same frame. Checkpoint validation accepts that exact destruction boundary rather than inventing a live store. Hauling can still obtain the historical capacity-pool identity for cancellation/cleanup; it cannot recover destroyed capacity or stock. New pile energy is not bank cash or free salvage.

Physical settlement is atomic across actor effects and object processing. Invalid/missing/duplicate order or a callback failure cannot commit partial stores/health/drops. Reentrant action writes and partial checkpoints are rejected while settlement runs.

## Evidence

- Pinned container comparisons:8 tests cover ordinary/owned countdown recurrence, both existing-pile orders, new spills and next-frame decay, JSON resume and repair/transfer/harvest immediately before decay. One energy-order example starts with1000 ground energy and42 in the container: ground-first ends1041, container-first1040. A new spill42 remains42 that frame, then41 on the next frame. A repair from4999 to5099 hits survives5000 decay at99 hits.
- Combined command `npx vitest run --config tools/processors/vitest.config.mjs tools/processors/container.check.mjs tools/processors/repair.check.mjs tools/processors/harvest.check.mjs tools/processors/hauling.check.mjs`:33 tests/four files passed in483ms.
- Relevant lifecycle/repair/inventory/miner/hauling/capture/checkpoint unit selection:38 tests/eight files passed in1.09s. Final directly affected lifecycle/capture/deleted-bank selection:7 tests/three files passed in852ms (overlap). Whole-home resume preserves a saved container's health/countdown; a destroyed container bank stays absent, cancels hauling with cargo retained and emits no income. Atomic order refusal, reentrancy and invalid future death clocks are exercised.
- Fixed smoke76 tests/15 files passed in733ms, selection unchanged. Final `npm run quality` passed (typecheck, lint, boundaries, pinned Lizard1184 production/970 test files, zero violations). Final `npm run check:bundle` passed. Full units/closure CI were not run for this incremental step.
- `node tools/engine/smoke.cjs --remote-pipeline-configured --external-pipeline-telemetry`: supported1000 `engine-kpb4xH` passed on clean published runtime source above, retaining existing exact receipt/route/source/task/control checks. Six snapshots150..155 retain native countdown49..44 exactly, decay amount5000, interval99 and actual245000 health. This establishes native capture/seeding and regression, not a complete private destruction calendar. Telemetry is local fixture memory/files only.

Exact source, compressed archive and hashes: `evidence/startup-container-lifecycle.json`.

## Required next work

Implement construction/completion and replacement object identity/material/checkpoint transitions. Supply qualified future native object-processing order, current environment/routing/banking and household/outside work; preserve existing world changes before admitting source income. Model controller/decay-rule changes, source capacity/power effects, body births/damage/TTL, cleanup/alternate sinks and remaining structure lifecycles. Reconcile material world with cash/spawn accounting once and prove exact multi-source future native receipt calendars, full horizon and strict5ms operation. ED-29 and later RC gates remain open. No financial admission or deployment enabled.
