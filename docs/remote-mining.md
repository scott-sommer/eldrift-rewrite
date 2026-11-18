# Remote energy extraction

ED-29 remains In Progress. This increment composes an explicitly supplied typed Mine demand into actual remote extraction. Automatic empire collection/selection/recruitment and hauling/infrastructure activation are still open.

## Responsibilities

| Boundary | Responsibility |
| --- | --- |
| app/remotes/assessment | Read-only source admission, body-specific travel, affordability and retained geometry |
| features/remotes | Expected economics policy, portfolio selection and exclusive home/room leases |
| app/remotes/task and assign-task | Shared lease resolution, stable-generation task renewal, continuous waits and retirement dispatch |
| app/remotes/native-movement | Current visible intel refresh, admitted room corridors, shared movement and owned-home refuge |
| app/remotes/native-mining-service | Retained-intel approach followed by live station selection and delegation to the existing miner |
| app/remotes/native-station | Current visible station observation after admission; no promotion of unseen stations to safe |
| features/mining/assignments | Existing tile exclusivity plus preference for a task's already held live tile |
| persistence/reservations | Detached active-scope queries, booking, expiry and release semantics |

Reservation wrappers retain their public factory/type names and payload format. They delegate to the shared task/movement boundaries. Existing persisted reservation task IDs remain valid and renew without being replaced. Normal local mining still uses its existing orchestration and acquire operation.

The remote task resolves current lease identity/generation/expiry before service. Travel can use retained source coordinates only through known-safe admitted traversal. Once the worker's room is visible and current, the service observes the source station, selects/acquires a live safe tile, and calls the existing native miner. Harvest, container handoff, repair, construction and movement effects remain owned by their established adapters/services. Ownership or safety rejection releases the tile immediately and sends the unit toward its owned refuge; transient waits do not consume the task failure-retry limit.

A held tile is preferred across ticks and resets, even when another previously preferred tile becomes free. The query returns detached active claims without initializing missing memory. Role logic never reads the reservation schema to make a competing booking mechanism. Terminal tasks use the existing shared scope cleanup.

Retirement preserves carried resources during movement. This increment returns the miner physically home with its cargo; it does not yet confirm delivery into home storage. The composed actor now hands this cargo to the shared hauling/transfer confirmation and quantity owners; see [remote-banking.md](remote-banking.md). Measured station extraction or container handoff is not presented as measured profitable transport or colony income.

## Native scenario

The explicit probe pays for a real WORK/WORK/CARRY/MOVE/MOVE worker through shared population/spawn dispatch. Its body and 12-tick recruitment travel allowance are fixture inputs, not an automatic production strategy. The room has a source and an existing container; this scenario does not construct the container or roads.

- Initial target vision seeds source coordinates. The vision witness is removed at tick 2, so approach occurs from retained intel before the worker supplies live room vision.
- First extraction is observed at tick 24. A hostile unit appears at tick 30; the task releases its tile immediately and the worker returns home at tick 39 with its cargo intact. Target vision is lost during this retreat.
- Fresh fixture-provided vision is restored when the threat is removed at tick 45. The service then resumes and actual container handoff is observed at tick 61. This proves conservative suspension plus response to fresh observations, not automatic scout recruitment.
- Lease authority expires at tick 89 with 50 energy carried. No subsequent extraction/container handoff occurs, and the exact carried amount remains unchanged through retirement. The worker is home with no task by tick 99.
- Global resets occur at ticks 20/56/95. Tile identity remains stable after recovery, and an unrelated booking remains unchanged throughout. After expiry, tile claims and queued recruitment are absent.

The first fixture run (engine-JIDGod) failed its cargo-return coverage assertion because expiry at tick 90 coincided with the preceding handoff emptying the carry. It was not a native execution error. Moving expiry one tick earlier exercises the intended nonempty return; the verifier was strengthened to assert unchanged source/container totals and exact cargo preservation after expiry. The initial failure provenance and relevant snapshots are archived alongside the passing evidence.

## Checks and limits

Post-grouping full units: 1,296 tests / 354 files pass in 10.66 seconds. Focused reservation/tile/smoke checks: 11 tests / 4 files pass in 312 ms. Type checking, lint, boundaries and packaged CommonJS/no-Node-globals validation pass. Pinned Lizard reports 600 production files and 504 test files, with zero violations.

Targeted native checks pass: remote mining (130 ticks), reservation (140), assessment (8), plus owned mining replacement, saturation and colony mining regressions. All three remote entrypoints were rerun after moving modules. Exact provenance is retained in docs/evidence/remote-mining-native.json. Probe trace rows and per-query bookkeeping contribute to reported Memory/CPU; these are not production pressure or soak acceptance figures.

The new mining case is registered as case 192. The full 192-case suite has not been run for this component increment; the preceding clean full-suite qualification remains 191 cases on f0ad244. Targeted shared-owner regression plus full fast checks keep this iteration bounded. Combined qualification remains part of subsequent operational integration and ED-29 acceptance.

Remaining work includes bounded automatic assessment/portfolio collection, source/room exclusions and reachability-life reporting, adaptive capacity, production body/travel/replacement policy, damaged-unit and spawn cancellation handling, cross-home handoff, automatic vision refresh/recovery, dedicated hauling and production integration of confirmed home banking, road/container desired state and construction, specialist keeper/mineral admission/tactics, dead-unit maintenance integration, operator/memory translation and final acceptance/performance gates.

Clean committed b922ad8 also passes all three remote entrypoints: mining engine-Ta8XvN (130 ticks), reservation engine-uQgBzq (140), and assessment engine-9kAVrr (8). Their exact clean provenance/digests are archived with the preceding runs. These scopes remain targeted component qualification, not a full 192-case or automatic feature acceptance claim.

The standalone extraction service keeps its cargo-preserving retirement contract. The new composed mining actor adds safe-home confirmed banking and explicit population-owner binding without changing that service; its separate qualification is recorded in [remote-banking.md](remote-banking.md).
