# Full private miner task and control state

ED-29 runtime source: `0b2cd257cbeae680c5a326f5c4472490453ec320`. The read-only miner observation now carries the complete `TaskRecord` as well as its task-scope header. The coherent home packet includes complete detached assignment and station-reservation owners, preserving outside/expired records, revisions and clocks. Missing owners remain null in observation; capture never initializes them.

## Private ownership

`hauling-state/world/control.ts` seeds these owners and selected miner task queues into the same isolated state port used by hauling. It validates role roster uniqueness/bounds, physical opening clocks, task identity/wake/expiry/scope, current assignment identity/generation/home/source and the exact current station claim/assigned flag. The native and private task schemas share the existing remote task definition. Productive courier policy retains its existing authority checks.

Checkpoint resume validates current control schemas, clock/revision and required task/owner presence without reseeding or reverting to the historical token. Renewed payloads and changed private claims remain current. Selected workers stay bounded to64; station claims to512. Native owner storage is never supplied to a mutating private controller.

Targeted integration uses the real `createRemoteMiningTaskBehavior`, `createTaskRunner`, assignment store and `assignRemoteTask`. A sleeping task with retries2 does not call its service before wake12, and resumes under its original task scope. Renewing only the assignment does not extend an already issued task token: the real task-assignment path must update it. That update preserves task ID while replacing the authority token from the current owner. JSON resume after renewal preserves future frames and the entire private checkpoint, including outside records. No perpetual renewal or current-tick clock is fabricated from an opening token.

These tests use controlled service/retirement ports to establish task/control semantics. They do not implement or qualify the miner's source-action selection, approach, maintenance or retirement physics.

## Evidence

- Native observation/miner-control/checkpoint selection:26 tests/five files passed in777ms. Final shared task/assignment selection:28 tests/five files passed in734ms. These selections overlap.
- Fixed smoke76 tests/15 files passed in621ms; selection unchanged.
- `npm run quality`: type check, lint, boundaries and pinned Lizard passed (1170 production/965 test files, zero violations). Final `npm run check:bundle` passed.
- `node tools/engine/smoke.cjs --remote-pipeline-configured --external-pipeline-telemetry` passed supported1000 (`engine-ZfKqzL`) on clean published runtime source above. Existing exact receipt-calendar, activated-route and source/inventory/claim checks remain enabled. The probe's native port rejects owner writes.
- Six snapshots150..155 preserve the entire native control owners and full selected miner task exactly when seeded privately. The miner retains its native task ID, phasework, wake83, retries0 and expiry1582 while token expiry advances348..353. Assignment revision/clock advance149..154; the captured station claim is assigned to that miner. The snapshot clock is intentionally not rewritten to the current tick.

Raw source-qualified evidence and hashes: `evidence/startup-miner-control.json` and deterministic compressed archive. Full units and closure CI were not run for this incremental step; ED-29 remains in progress.

## Remaining controller work

The shared native/private mining actor cycle and private station selector now exist; see [shared mining cycle](startup-shared-mining-cycle.md). Finish physical build/repair/maintenance and current environment/movement/banking providers, preserving effective body powers, station acquisition/renewal, visibility/safety and real actor ordering. Build/repair/handoff/harvest must operate on the shared material world; approaching, source depletion, unavailable infrastructure and authority loss need their actual outcomes. Capture/model household policy cursor and external commitments, source/container capacity/power/lifecycle transitions, prospective bodies and cleanup. Reconcile material ownership with cash/spawn accounting once and prove exact multi-source future calendars under native ordering before admission. Full horizon, strict5ms and later RC gates remain open. No financial admission or deployment enabled.
