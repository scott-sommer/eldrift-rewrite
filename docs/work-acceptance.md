# ED-22 acceptance audit

Audit date: 2026-11-15. Implementation baseline: 88829d5. This reconciles current evidence, rather than treating historical progress notes as completion claims.

## Recovery criterion: verified

Requirement: explicit entry/exit hysteresis, donor selection, emergency spawning and reassignment through the ownership boundary.

- Hysteresis and donors: features/recovery/policy.ts enforces strict entry, inclusive exit, owned RCL eligibility and deterministic donor filtering/ranking. features/recovery/store.ts persists assessment cadence. app/native-recovery.ts injects native observations and configured thresholds.
- Emergency population: features/recovery/economy-policy.ts derives operational overrides without modifying operator configuration. Native mining/logistics apply those overrides before existing demand/execution code. Recovery does not introduce a competing resource executor.
- Donor execution: app/native-support.ts assesses each target, maintains the donor fleet and reconciles resource requests through shared transfer execution. Completion is evidenced by physical inventory and confirmed receipts.
- Ownership handoff: features/recovery/distributor-ownership.ts converts only the matching home/owner pair; app/native-distributor-recovery.ts applies it on assessment ticks. The executor and holder identity stay stable, retaining cargo, tasks and pending confirmation.

Fresh native runs all passed, and their evidence files have empty errors and messages arrays:

| Scenario | Evidence directory | Observed acceptance |
| --- | --- | --- |
| --energy-recovery | engine-V07S6U | Exact 10,000 entry and 50,000 exit boundaries; downgrade override; donor proposals; queued upgrader suppression/restoration |
| --recovery-economy | engine-SOGM6w | No seeded economic population; emergency miner/courier spawning, actual harvesting and confirmed consumer/banking deliveries; exit after durable storage replenishes |
| --automatic-support | engine-xUbkNv | Actual donor courier spawning, two loads totalling100 confirmed energy, target exit, empty courier returned to ordinary donor logistics; no residual queue/reservation |
| --distributor-recovery | engine-Ey9rpG | Same pending50energy transfer settles across ownership conversion; equality12,500 suppresses restart,12,501 permits it; actual replacement spawning and code reload without duplicate units |

The five focused recovery/distributor/support policy test files pass17tests in225ms. Boundary tests additionally cover foreign ownership, donor eligibility/order, persisted cadence, config invalidation and duplicate donor rejection. The native cases use deliberately small policy thresholds where stated by their fixtures; they do not establish release soak or CPU bounds.

## Criteria still open

Role inventory reconciliation remains incomplete, including operator assignment translation and expansion-related builder paths. The combined ordinary-colony criterion already has its separate1,100-tick evidence in work.md.

The initial audit found that native-work marked every site ready. The integration below resolves that dependency gap. That increment did not by itself complete acceptance; the full regression and criterion reconciliation are recorded below.

This audit verifies only the recovery acceptance criterion; ED-22 and the overall rewrite remain incomplete.


## Construction dependency integration

Plan schema version2 adds optional dependencies, referencing same-plan placements by type:x:y. Validation rejects unknown prerequisite keys, duplicate edges, self references and cycles using nonrecursive graph traversal. Version1 migrates identically: old entries retain priorities, source ownership, revision and strategy without invented dependencies. Each entry is bounded to100 prerequisites within the existing10,000-entry plan limit.

app/native-work-assessment.ts composes planning state with native observations before work selection. Completed prerequisites must be actual matching structures with friendly or neutral ownership. A site or an issued build action does not count as completion. Planned sites remain blocked below their required RCL or while prerequisites are absent; rebuilding a destroyed prerequisite blocks dependent work again. Unplanned sites retain ordinary behavior. Rooms without planning state do not initialize an empty plan. The existing worker task reconciliation and shared build executor remain responsible for actions.

Native --work-dependencies runs production main with an extension site that would normally outrank a road. Its persisted plan requires the road first. Observations: road290/extension195; road295/extension195; road built/extension195; both built. The dependency therefore blocks native selection and releases on observed completion, not on accepted intent. Evidence artifacts/engine-mKXz5U/evidence.json; no caught runtime errors. Native regressions worker-runtime (engine-dSe3LC), work-selection (engine-sNwOlo) and bootstrap-harvest (engine-dXiDbI) pass.

All581 tests/176files pass in4.64s. Final quality305 production/275 test files passes with zero Lizard violations. Initial graph/schema functions exceeded CCN; dependency indexing and entry validation were extracted, without exceptions. Full native aggregate has not been rerun for this increment.

This is dependency consumption by workers, not automatic layout strategy generation or construction-site creation. Those remain required planning work. Schema rollback to code supporting only version1 is not safe after migration; the release migration/rollback rehearsal must account for version2.

## Remaining ordinary-upgrader miner fallback

Source inspection at frozen baseline confirms role.upgrader.js57-64 actively calls utilV2.findMyMiner/collectEnergyFromMiner when controller-link/storage collection is unavailable and assignedNode exists. This is not the commented ordinary-builder branch. utilV2.js103-148 finds/caches the miner by assigned coordinates;150-188 prioritizes adjacent dropped energy, a cached dump target, rich local storage, the miner's dump target, approaching the miner, then nearest dropped resources if no miner exists. withdrawFromTarget at83-101 approaches the assigned position when its cached target disappears.

The rewrite upgrader profile currently ranks drops/controller links/storage only. It neither reads a worker station assignment nor follows its miner deposit endpoint, so ordinary-upgrader parity is incomplete. The next implementation must introduce a feature-owned source/station assignment, observe current deposit infrastructure, and feed chosen endpoints through the existing collection reservations/action adapter. Travel/wait fallback must remain explicit when the endpoint is missing; it must not claim a completed transfer. Existing source identity and container/link/storage metadata in MiningStation provide the boundary, avoiding inference from legacy role strings.

Deliberate corrections to test: legacy miner matching compares coordinates without enforcing the assigned room; cached miner/target can become stale; withdrawFromTarget reads .amount from numeric Store values and may select a non-energy resource. Match full room/source identity, revalidate live endpoints, and collect energy specifically. The helper's suicide on missing assignment must not become the normal absence-of-assignment policy. Preserve unrestricted station endpoint access only within explicit worker reserve/ownership rules. Operator assignedNode translation remains separately traceable; it is not implemented by this audit.

## Work-selection criterion: verified after full native regression

Full pinned native suite at implementation83357c8 passes137checks in351.14s, including the two expected-failure detector cases. artifacts/engine-suite.json records each scenario and evidence path. An additional inspection of all nonnegative evidence reports found no errors and no messages containing Error:.

Requirement mapping: critical repair and downgrade precedence are exercised in work-selection.test.ts; controller downgrade overrides recovery investment suppression in native --energy-recovery (engine-bG07FH). Resource reservation/reserve behavior is exercised in worker-energy.test.ts and native --worker-collection (engine-o9SOMk), where storage stops exactly at50,000 and remaining container energy funds work. Dependency ordering executes through production main in --work-dependencies (engine-PXUu91), with actual road completion releasing the higher-priority extension. --work-selection (engine-RsbY8l) checks construction/repair/upgrade progression. These paths share existing work task execution and action arbitration; the plan integration introduces no second executor. Focused selector/reserve/dependency checks pass11tests in194ms.

The combined1,100-tick colony resilience case also passes in this aggregate (engine-2A1eEV). This verifies the work-selection criterion; it does not complete role parity, later layout strategies/site placement, or release CPU/memory/soak requirements. ED-22 now has recovery, work-selection and combined-colony criteria verified; role traceability remains open, including the assigned-miner fallback above.

## Assigned-source collection integration

Added feature-owned creep.memory.workerSource {source,position} for ordinary upgrader energy-profile assignment. It identifies a source by ID plus full room/coordinates rather than a cached miner role/name. app/native-worker-miner.ts observes current mining station infrastructure and feeds selected collection orders back into the existing reserved worker collection adapter. Ordinary nearby substantial drops/controller links/eligible storage retain precedence; assigned station endpoints precede distant-drop fallback. At the station, adjacent drops precede link/container/storage deposit endpoints. Missing stock can approach/wait near the station; partial collected energy can resume useful work. Unseen assigned rooms use shared movement to the stored position. No new action executor or transfer receipt model is introduced.

Endpoint observations collect energy only, deduct outstanding shared stock claims, and preserve configured storage reserve. Unrelated containers are excluded. A missing visible source falls back to the ordinary collection order; stale endpoint IDs are not cached. This deliberately replaces utilV2's cached miner/dumpTarget coupling with observed station infrastructure and avoids the numeric Store .amount bug. Legacy explicit dumpTarget/assignedNode operator translation is not yet implemented.

Native --worker-miner runs production main with an empty ordinary upgrader, an assigned-source container holding50energy+30hydrogen, and an unrelated500energy container. It withdraws all50energy from the assigned deposit, leaves hydrogen30/unrelated500 unchanged throughout, and finishes20ticks with34energy and controller progress16. Evidence artifacts/engine-xIblNS/evidence.json. This fixture seeds assignment and deposit stock; it proves native endpoint collection and upgrading, not concurrent miner production or long-route lifecycle.

All583 tests/177files pass in5.47s. Quality307 production/277 test files passes with zero Lizard violations. Native regressions --worker-profile-upgrader (engine-Z9JDhz), --worker-collection (engine-4Kphp1), --bootstrap-assignment (engine-QLEzLj) pass. Pure selection tests verify adjacent-drop/endpoint/distant-drop ranking, unrelated-source exclusion, shared allocations, foreign-room exclusion and storage reserve. New case registered; the previous137-case full aggregate remains the last aggregate run.

Remaining evidence: cross-room/unseen travel and endpoint disappearance/replacement under native execution, operator assignment translation, and explicit legacy cached endpoint overrides. Role-parity criterion remains open.

## Assigned deposit replacement and unseen-room travel

Added --worker-miner-replacement: remove the assigned container after tick1, before withdrawal; leave it absent for7observations; replace it at a different adjacent tile with a new native ID after tick8. The worker remains empty with zero upgrade progress while absent and leaves the unrelated500energy container untouched. It discovers the replacement, collects50energy by tick16 and reaches4upgrade progress by tick20. Native evidence engine-cXPYmH; original collection regression engine-GL5zop also passes. The fixture replaces infrastructure/stock, never worker cargo or controller progress.

Added --worker-miner-travel: assigned source/deposit in initially unseen neutral E0N1, worker starts at the exit of owned W0N1. It must enter E0N1, collect50energy while preserving30hydrogen, return to its home controller near the border, and upgrade. The first run (engine-XupjkM) collected successfully but never returned: native PathFinder's geometric range included the neighboring room, whereas action range requires the target room. Restricting goals to destination-room tiles exposed a second issue (engine-hdAKo5): work could stop on an exit and repeatedly transfer back out.

Corrections are shared at movement boundaries. Native ranged goals that reach a border expand into exact destination-room tiles; interior destinations exclude exit tiles. movementArrived is shared by navigator, movement step, native path completion and work execution: interior targets require an interior arrival, while explicitly requested exit destinations remain valid. Geometric withinRange remains unchanged for layout/station validation. Ordinary non-border path requests retain a single native goal. Expanded goals are bounded by room dimensions; their CPU impact remains part of the later performance gate.

Final native travel result engine-BfYACa: both rooms visited, source room initially unseen, native energy50 collected, hydrogen preserved, final home W0N1 with16energy and34controller progress at40ticks. Unit regression covers rejection of exit arrival for interior targets, acceptance one tile inside, foreign-room rejection and explicit exit targeting. All584tests/177files pass4.65s; quality308 production/278 test files has zero Lizard violations. Full native regression is recorded below after completion.

Full native regression passes140checks in360.77s, including expected-failure detectors. All nonnegative evidence files were additionally inspected: no errors and no caught Error: messages. Refreshed replacement evidence engine-GNmDoT, unseen-room travel engine-ZPsDFg and1,100-tick colony resilience engine-bowCRo. Source inventory entries for builder/upgrader/master/UpgradeRoom/recovery now reference the implemented evidence and retain explicit module-parity limits; no empty not-ported claim is used for the exercised specialist paths. ED-22 remains open for final role reconciliation; release and later planning/operator gates remain unchanged.

## Automatic ordinary-upgrader source assignment

Source reconciliation found spawner.js1994-2027 assigns ordinary upgraders a source through nextConsumerSource (2481-2495); the legacy cursor rotates across sources. Runtime now fills missing workerSource assignments for enabled ordinary upgraders using the upgrader energy profile. Existing assignments, including explicit cross-room choices, are preserved. Selection balances current live assignment counts with deterministic ID ties rather than a room-global rotating cursor; source room participates in counting. Missing sources yield no assignment rather than crashing or killing the worker. Other worker modes/profiles are unchanged.

Native --worker-miner-automatic seeds an unassigned worker, not workerSource. Production main assigns it on tick1, retains assignment, collects50energy from the matching deposit while preserving hydrogen/unrelated stock, and reaches16progress at20ticks. Evidence engine-3y0CMe. Explicit remote assignment regression --worker-miner-travel (engine-G1Gye3) still returns home with34progress; --worker-profile-upgrader (engine-PQRPJU) preserves normal collection priorities. All585tests/178files pass4.68s; quality310 production/279 test files has zero Lizard violations. Last full aggregate remains140; new scenario registered for the next full run.

Clarification of earlier open-item wording: inspected assignedNode assignment is generated by spawner.js, while myMiner/dumpTarget are utilV2 caches. Searching consoleCommands.js found no assignedNode/dumpTarget writes. This evidence does not establish a dedicated operator setter that must be invented. Legacy live-creep source mapping belongs to the existing ED-44 compatibility/import boundary, with caches reconstructed from current station observations; current production must not automatically import arbitrary legacy root memory. ED-39 still owns actual registered controls/flags. CreateRoom/NewSpawn builder orchestration remains explicitly owned by ED-30. These are existing required backlog responsibilities, not dropped capabilities or proof that ED-22's remaining role audit is complete.

## Native fortifier repair and remaining source details

Added --fortifier-work,12ticks of production main. A10energy fortifier repairs a100-hit wall and100-hit rampart to configured300-hit targets, spends4energy doing so, then uses6energy for controller upgrading. Neither barrier exceeds300 and upgrading starts only after both reach their target. Evidence engine-28lsMX. Quality310 production/280 test files passes with zero Lizard violations. Production code is unchanged; last unit aggregate remains585 and full native aggregate140; new case registered.

The complete role.wallBuilder.js source audit reconfirms outstanding details: RCL-derived selection thresholds (half RAMPART_HITS_MAX below8, max minus400000 at8), roomCache.wallsLevel override, fallback from20000*distance to1*distance when the first pass finds nothing, and Art-region exclusion. Native fixed-cap repair evidence does not prove these profile semantics. jobs repair completion must be reconciled separately from wallBuilder's weighted selection threshold before porting.

Art-region markers were absent from the26 README-derived flag entries. Added a source-backed27th record: first room flags containing Art plus BL/TR define the inclusive rectangle; both barrier kinds are excluded. isArt repeats the BL undefined guard and can dereference a missing TR. Porting must validate both corners and handle malformed/ambiguous inputs explicitly. Pure excluded-repair support exists; native marker/constraint composition is still missing. ED-22 retains responsibility for fortifier policy; ED-39 retains flag input compatibility. No role-parity acceptance is checked by this fixture.

## Selectable legacy fortification profile

Reviewed jobs.js410-437: repair jobs have no desired-hit field and retain their target until energy exhaustion or disappearance. role.wallBuilder.js's weighted ceiling selects a target; it does not cap the repair burst. These are now separate concepts.

workerFortificationProfile defaults fixed, retaining existing workerWallHits/workerRampartHits behavior. Selecting legacy for fortifiers derives the selection ceiling from native RAMPART_HITS_MAX: half belowRCL8, maximum minus400000 atRCL8. workerFortificationCeiling >0 overrides this, corresponding to roomCache.wallsLevel;0 selects derivation. Pure legacy selection first considers hits+20000*range strictly below ceiling, then hits+range if none qualify. It retains a still-valid chosen barrier across threshold crossings while carrying energy; an empty worker reselects. Existing room/type/ownership/exclusion filters and shared action execution apply.

Deliberate corrections: a fully repaired or missing target is released rather than retaining a legacy repair job forever after repeated invalid-target returns; deterministic ID breaks equal scores. Shared higher-priority construction/downgrade behavior may preempt repair. No legacy raw memory field is read automatically. Art region conversion is still open and must supply the existing exclusion boundary.

Native --legacy-fortifier atRCL2 starts both barriers149900, worker10energy. Both fail the20000distance pass but qualify in the fallback. The selected barrier reaches150900 while the other remains149900; all10energy goes to repair and no upgrading occurs. This proves RCL-derived150000 admission, low-weight fallback, and retention beyond the ceiling. Evidence engine-fFDnrf. --fortifier-work remains unchanged semantically: both barriers stop300 then6upgrade progress (engine-BDDsSv). All587tests/179files pass4.78s; final quality312 production/281 test files passes with zero Lizard violations. Last full native aggregate remains140; new profile case registered.

## Art-region compatibility and native exclusion

Implemented the source-discovered Art BL/TR convention through a pure operator parser, a reusable barrier-exclusion transform and native fortifier composition. Parsing retains legacy substring recognition but requires exactly one distinct BL and TR in the room, valid coordinates and correctly ordered corners. Inclusive rectangle boundaries apply to both walls and ramparts. Other structure types and prior exclusions are preserved. Only fortifier assessment consumes this legacy input; flags do not create a second work executor.

Malformed/ambiguous input deliberately suspends all barrier repairs for that room's fortifiers until corrected, rather than throwing on a missing TR or guessing the first enumerated corner. A concise console diagnostic is emitted once per changed invalid reason; correction/removal clears diagnostic suppression. This is bounded in-process diagnostic state, not a claim of persisted notifications across resets. Non-barrier work remains eligible. Actual flag ownership comes from the player's room flag API, and work runs only in owned rooms.

Native --art-region creates both markers through native APIs, moves TR to release only the rampart, removes BL to create an invalid incomplete region, then removes TR to clear the exclusion. Both barriers start100; through tick4 neither changes; rampart reaches300 by tick8 with wall100; incomplete-region ticks9–11 retain wall100; after removal the wall reaches300 at tick14. Final energy6 accounts for four repair actions. Exactly one expected missing-corner diagnostic is asserted, with no unexpected console messages or runtime errors. Evidence engine-OgqZp9. Initial run engine-Z2zYdT passed behavior but failed the harness's blanket zero-message assertion; it now expects exactly the intended diagnostic only for this scenario, without relaxing other cases.

All589tests/180files pass4.68s. Final quality315 production/283 test files has zero Lizard violations. Legacy fortification regression engine-eQMcNU and fixed-cap regression engine-e0BOs4 pass. Last full native aggregate140 is unchanged; Art and recent fortifier cases are registered for the next full run. This completes the Art input/exclusion sub-capability, not the whole ED-39 operator backlog or final ED-22 role reconciliation.

## Ordinary builder Art-wall correction

The continued role.builder.js audit found another active Art consumer in its ordinary home-room wall branch. Unlike wallBuilder, this branch excludes walls only; its earlier rampart branch does not apply Art filtering. The previous fortifier-only integration therefore did not preserve builder behavior.

The shared exclusion transform now accepts selected structure types, and native-art-assessment composes the same validated marker input for builder and fortifier modes. Builders protect constructedWall only; fortifiers protect both barrier types. Malformed corners protect the applicable types, preserving the existing diagnostic and other work eligibility. Upgrader assessment is unchanged.

Native --art-builder runs production main: while both markers enclose wall/rampart, rampart reaches300 by tick4 and wall stays100. Missing-corner observations retain wall100. Removing all markers permits wall repair to300 by tick14; final energy6. Evidence engine-pZ1LaS. Fortifier lifecycle regression engine-FPrVaY still protects both types initially. The scenario is registered in the full suite. Pure tests verify wall-only filtering for valid and malformed regions. All589tests/180files pass4.65s; quality315production/283testfiles passes with zero Lizard violations. No full aggregate rerun is claimed.

Builder renewal is called only for newSpawner at role.builder.js run entry, so its expansion lifecycle remains traceable to ED-30 rather than ordinary builder renewal. Final ED-22 role reconciliation remains open.

## Upgrader-v2 Transfer marker input

role.upgraderV2.js evaluateNextTask permits a full controller-link load, then nearby container/storage collection, before checking current-room flags containing Transfer to suppress distant home-storage collection. Existing energy profile already represented the selection policy through workerHoldStoragePosition, but native flags were disconnected.

native-worker-hold now combines explicit hold configuration with current-room Transfer markers for the upgrader-v2 profile only. It does not impose a general movement lock or suppress nearby energy collection; it feeds the existing distant-storage fallback policy. Removing the marker releases the derived hold on the next observation, without sticky legacy state. Other profiles are unchanged.

Native --worker-profile-flag-hold creates a real Transfer marker on tick1 with explicit hold configuration false. On ticks2â€“3 the empty worker remains19,21 with distant storage available and no eligible link. Evidence engine-Gh95dU. Unit boundary coverage verifies marker removal, other-profile isolation and explicit hold. All590tests/181files pass4.59s; quality316production/284testfiles passes with zero Lizard violations. Initial test import was corrected before these checks. Full aggregate not rerun; scenario registered.

This implements one Transfer consumer only. Transfer-driven hauler recruitment and return-position behavior remain ED-39 integration work, explicitly retained in flag inventory. ED-22 final role reconciliation remains open.
