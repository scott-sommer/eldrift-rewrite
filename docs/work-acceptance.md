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

The initial audit found that native-work marked every site ready. The integration below resolves that dependency gap. Final work-selection acceptance reconciliation and a broader native regression remain outstanding; the criterion is not automatically checked by this increment.

This audit verifies only the recovery acceptance criterion; ED-22 and the overall rewrite remain incomplete.


## Construction dependency integration

Plan schema version2 adds optional dependencies, referencing same-plan placements by type:x:y. Validation rejects unknown prerequisite keys, duplicate edges, self references and cycles using nonrecursive graph traversal. Version1 migrates identically: old entries retain priorities, source ownership, revision and strategy without invented dependencies. Each entry is bounded to100 prerequisites within the existing10,000-entry plan limit.

app/native-work-assessment.ts composes planning state with native observations before work selection. Completed prerequisites must be actual matching structures with friendly or neutral ownership. A site or an issued build action does not count as completion. Planned sites remain blocked below their required RCL or while prerequisites are absent; rebuilding a destroyed prerequisite blocks dependent work again. Unplanned sites retain ordinary behavior. Rooms without planning state do not initialize an empty plan. The existing worker task reconciliation and shared build executor remain responsible for actions.

Native --work-dependencies runs production main with an extension site that would normally outrank a road. Its persisted plan requires the road first. Observations: road290/extension195; road295/extension195; road built/extension195; both built. The dependency therefore blocks native selection and releases on observed completion, not on accepted intent. Evidence artifacts/engine-mKXz5U/evidence.json; no caught runtime errors. Native regressions worker-runtime (engine-dSe3LC), work-selection (engine-sNwOlo) and bootstrap-harvest (engine-dXiDbI) pass.

All581 tests/176files pass in4.64s. Final quality305 production/275 test files passes with zero Lizard violations. Initial graph/schema functions exceeded CCN; dependency indexing and entry validation were extracted, without exceptions. Full native aggregate has not been rerun for this increment.

This is dependency consumption by workers, not automatic layout strategy generation or construction-site creation. Those remain required planning work. Schema rollback to code supporting only version1 is not safe after migration; the release migration/rollback rehearsal must account for version2.
