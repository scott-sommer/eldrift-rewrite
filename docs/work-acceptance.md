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

Work selection has tests for critical repair, downgrade precedence, resource reserves and dependency-ready filtering. However, app/native-work.ts currently calls observeWorkAssessment(room) without a blocked-site set; the adapter consequently marks all native sites ready. Selection-level dependency tests alone do not establish production construction dependency integration. Keep that criterion unchecked until dependency state is connected and tested through production composition. Do not relax the criterion to match the current adapter.

This audit verifies only the recovery acceptance criterion; ED-22 and the overall rewrite remain incomplete.
