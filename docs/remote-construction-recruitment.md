# Remote construction recruitment implementation status

Implementation 3921fc1 adds pure home-wide construction funding and worker admission. It is not yet connected to automatic spawning or runtime registration.

## Implemented contracts

- `remoteConstructionWorkersEnabled` defaults false; `remoteConstructionMaximumWorkers` defaults 2 (0..20), `remoteConstructionBodyBudget` defaults 300 (0..3000), and `remoteConstructionEnergyReserve` defaults 50000 (0..1000000).
- The body recipe repeats WORK, CARRY, CARRY, MOVE, MOVE within budget/part limits. Budgets below 300 produce no body.
- Stable construction ownership includes home, target room and lease generation. Invalid or ambiguous identities are refused; a new generation cannot inherit old service authority.
- Admission reserves each selected room's remaining unboosted construction energy once, crediting construction supply already carried. Storage above reserve funds work; spawn energy pays for additions. Existing work is prioritized. Worker ceilings and additional remote workforce slots independently constrain additions.
- Recruitment and worker execution can share the current assignment, safe corridor, exact plans and visible owned sites via `createNativeRemoteOutpostView`. The existing worker selector retains priority/target behavior.

## Checks

Full units: 1395 tests / 379 files / 9.96 seconds. Focused budget/view/selector/smoke: 13 tests / 328 ms. Type/lint/boundaries and Lizard pass (662 production / 551 test files, zero violations). A clean 3921fc1 400-tick native road regression preserves construction, loaded withdrawal and refund behavior after the view extraction; see evidence/remote-construction-budget-native.json. Admission controls are unit-qualified, not natively exercised by automatic recruitment yet.

## Required next wiring

1. Observe one bounded candidate per current outpost lease using current eligible sites; calculate remaining construction energy from actual site progress. Keep source/miner economics and home-funded construction/refunds distinct.
2. Derive loaded travel/retirement bounds from the current body, admitted planned routes and actual terrain/infrastructure. Reject infeasible service; do not substitute an unexplained global distance or lifetime constant.
3. Build population demand with stable generation-scoped ownership. Reconcile only construction-owned queue entries and spawning actors; preserve unrelated work. Count native/spawning workers and pending source requests against the shared remote workforce limit. Pending construction requests reserve their slot and spawn cost once through candidate allocation; do not count them both as existing workers and new additions.
4. Repeat lease/body/configuration/funding/slot/site admission at final spawn dispatch, including when bounded recruitment has not revisited the owner. Existing source-fleet admission must continue to run.
5. Register construction definitions, owned-room recruitment and empire actor service through explicit main composition. Service uses the existing work cycle, shared home collection with the configured reserve, and banking liabilities before optional CPU work. Disabled/withdrawn/stale actors retire cargo safely.
6. Qualify an actually spawned builder through the ordinary main loop: construction away from the source station, exact initial spawn/construction funding, loaded remote withdrawal and confirmed home refund, reloads, unrelated work, insufficient funding and disabled admission. No pre-existing builder or mid-run resource injection may stand in for this proof. Run the larger native milestone gate after runtime wiring.

Automatic road acceptance and ED-29 remain open until that integration and evidence exist. Broader startup/payback, reservation, adaptive capacity/reachability, home loss and ED-43 pressure obligations remain separate.
