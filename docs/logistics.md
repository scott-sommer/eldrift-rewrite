# Logistics implementation (ED-21)

Status: in progress. The feature must preserve couriers, distributors, haulers, scavengers, mineral logistics, source storage fallback, and link roles. ED-20 completion does not waive the downstream obligations in mining-acceptance.md.

The first mechanism computes carrying capacity as the sum of each route's production times its own round-trip duration, divided by expected utilization. Separate outbound, loaded-return, service and delay times allow terrain, load and congestion to influence demand without importing pathfinding into population arithmetic. Results expose per-route contributions, capacity shortfall and whole-worker demand.

Callers must supply effective production rates and measured/estimated travel times, exclude retiring workers according to the shared replacement horizon, and count pending requests once. Routes are additive obligations; the formula does not claim optimal multi-stop tours, delivery evidence or actual colony throughput. Replacement travel is a population lifecycle input, not a surcharge on every hauling trip.

Next: explicit stock/free-capacity reservations and request lifecycle, then persistent hauling tasks and native observations through the shared action/movement/spawn boundary. Required failure scenarios remain empty source, full sink, partial transfer, death, storage loss, reset and contention. Legacy reference files remain read-only; arithmetic is a new mechanism, not a claim that role.hauler's state machine has been ported.

Validation: npm run quality passed (122 production files, zero Lizard violations); all 289 unit tests passed in 2.89s. Four new demand tests cover asymmetric sources, load/travel/service/delay inputs, utilization, committed capacity and invalid/overflow inputs. No engine rerun for this pure, not-yet-wired mechanism.

## Quantity reservations and lifecycle
A separate versioned quantity ledger supplements exclusive tile leases. Each claim has a stable ID, owner, holder, task/mission scope, expiry and up to eight pool allocations. A single persisted write books all pools or none: a hauler can reserve source stock and sink capacity atomically. Shared store-capacity pools span resource types; resource-specific stock pools remain separate. Same-owner renewal replaces its own allocations, supports shrinking quantities, and rejects identity theft. The ledger is bounded to 1000 claims and rejects malformed/future-version state through standard persistence.

Shared reservation cleanup now covers both stores on task completion/cancellation, unit retirement, mission cancellation, colony transfer and tick expiry. Unused namespaces are not created. Tests cover contention across resource types, reconstruction, atomic rejection, renewal/shrink, detached snapshots, cancellation, death cleanup and expiry. Quantity lifecycle integration is tested through application helpers; native retirement/maintenance fixtures additionally protect the existing exclusive-reservation behavior.

Caller contract: pool capacities are current observed totals; reservations describe outstanding obligations against those totals. Stable pool identity must match actual shared storage semantics. Requests must reconcile confirmed transfers before renewing, release obsolete pools after pickup, and retain sink obligations for in-transit cargo. External stock/capacity changes can invalidate existing promises; request reconciliation must handle that instead of assuming a booking guarantees a future transfer. That reconciliation and native hauling are still pending.

Validation: 297 unit tests passed in 2.88s; quality passed (125 production files, zero Lizard violations); packaged CommonJS/source-map checks passed; targeted native retirement and maintenance scenarios passed. Full engine suite was not rerun for this change.

## Explicit request booking
LogisticsRequest declares source, sink, resource, outstanding quantity, priority, expiry and owner. The reservation adapter books a request-quantity pool as well as stock and sink capacity, so multiple workers cannot over-allocate a single request even when stores have ample space. It admits a partial quantity bounded by the worker's maximum and existing bookings, with stable scope-based identities.

After confirmed pickup, delivery booking removes the source-stock pool before checking destination availability. This removal is ownership checked and persisted independently, so a newly full sink does not leave already-collected stock reserved at the source. Existing cargo obligations remain when no delivery capacity can be admitted. Shared sink-pool identity is supplied explicitly for ordinary stores versus resource compartments. A booking does not prove a native intent succeeded.

Still required: durable request queue and completion accounting, observed cargo-delta reconciliation, native endpoint observations/actions, prioritization and expiry/loss policy. Callers must pass confirmed phases and the outstanding request quantity; they must not infer delivery completion from an accepted intent. The current helper alone is not a complete transfer state machine.

Validation: all 301 unit tests passed in 2.91s; quality passed (127 production files, zero Lizard violations). New tests cover split request allocation, partial pickup, cross-resource sink contention, stable renewals, and stock release with a full destination. No engine run for this not-yet-wired request-booking mechanism.

## Durable requests and confirmed delivery accounting
The feature-owned per-room request queue persists immutable request identities, cancellation state and delivery receipts. Pending work is sorted by priority with deterministic owner/ID ties and exposes only outstanding quantities. Different owners may use the same request ID. Matching producer resubmissions are idempotent; changed parameters require a new identity. Completed/cancelled records remain until their expiry to prevent resubmission from recreating work.

Each confirmed delivery uses a stable receipt ID and quantity. Receipt replay has no effect; conflicting replay and over-delivery fail without mutating saved state. Partial receipts survive reconstruction. The queue rejects expired submissions and ignores confirmations for absent/cancelled/expired records. State is bounded at 200 records and 256 receipts per request; use finite request windows and bounded quantities rather than indefinite aggregate requests. Expired records are pruned on submission.

The queue accepts evidence from its caller; it does not itself observe native cargo or infer success from an intent. The upcoming task layer must persist an attempt identity before issuing an action, compare subsequent observations, confirm the receipt once, reconcile its reservations, and react to queue cancellation/expiry while retaining or redirecting cargo safely. Queue cancellation is not a command to discard cargo and does not directly mutate unrelated task state.

Validation: all 304 unit tests passed in 2.98s; quality passed (129 production files, zero Lizard violations). Tests cover partial delivery, reset/replay, conflicting receipts, over-delivery rejection, completed/cancelled resubmission, owner isolation, ordering, expiry and parameter immutability. No engine run for this not-yet-wired persistence layer.

## Attempt journal and confirmation
The per-unit transfer journal persists an attempt before its caller issues the native action. Pending or unacknowledged attempts prevent another begin, including after reconstruction. Settled evidence is retained until explicit acknowledgement, allowing the application to commit an idempotent request receipt and reconcile reservations first. This protocol must be used by the forthcoming native hauling task; the journal does not invoke actions itself.

Pinned engine 4.3.2 source inspection confirms transfer emits EVENT_TRANSFER from creep to target; withdraw emits it from target to creep. The native observation adapter reads those room events. Confirmation accepts only the next tick's matching source/target/resource events, bounded by the attempted amount. Same-tick observations wait, absent vision or missed observation windows become unknown, and cargo loss alone cannot prove delivery. Unknown outcomes require recovery rather than manufactured receipts.

Pickup emits no equivalent transfer event in the pinned engine. Its provisional confirmation uses a bounded next-tick cargo increase and rejects observations with other transfer events affecting that resource on the unit. Native pickup scenarios and exclusive task action composition must validate this weaker evidence path before claiming full pickup attribution.

Validation: all 307 unit tests passed in 3.03s; quality passed (132 production files, zero Lizard violations). Tests cover event direction, partial delivery, unrelated cargo loss, observation windows, bounded pickup delta, reset suppression and acknowledgement before replacing evidence. Native event-log behavior still requires a packaged engine scenario; no real-engine confirmation claim is made here.

## Native transfer-confirmation evidence
The four-tick --transfer-confirmation scenario now exercises the real engine event adapter and journal with reconstructed services each tick. A worker withdraws 30 energy, then uses native transfer-all against a container with 10 free capacity. Observed stores are [30,0,1990], [0,30,1990], [0,20,2000], [0,20,2000]. Confirmed quantities are 30 (withdrawal), 10 (delivery), and replayed 10. Exactly one delivery receipt for 10 is persisted; replay returns false, leaving 20 outstanding. Reconstructed journal.begin rejects a duplicate pending attempt before the fixture issues its one native action.

The initial fixture requested an explicit transfer amount of 30 with only 10 free; the native API rejected that call. The corrected capacity-limited case uses transfer-all. Production hauling should clamp explicit amounts to the admitted reservation and observed free capacity; it must never turn a rejected intent or zero confirmation into a positive receipt.

Validation: targeted real-engine scenario passed (artifacts/engine-jcq6XX/evidence.json); smoke passed in 160ms; quality passed with zero Lizard violations before the single argument removal in the fixture, and the final fixture compiled/executed through esbuild successfully. Registered as case 34 in the full engine suite; full suite not rerun for this isolated scenario addition. This proves store transfer/withdraw confirmation and receipt replay, not native pickup attribution or a complete hauling controller.

## Native transfer execution
createNativeTransfer now composes the shared resource step, movement service and action arbiter. Narrow injected begin(attempt) persists the attempt before native invocation without coupling the adapter to feature persistence. Store withdrawals/deliveries use explicit amounts bounded by reservation maximum, current stock and current free capacity. Target validation separates dropped resources, store structures, tombstones/ruins and units; withdrawal from units and delivery into dead-unit stores are rejected.

Pickup has no amount argument in Screeps. If the engine would collect more than the admitted reservation, the adapter blocks instead of silently violating reservations; orchestration must reserve the whole eligible pickup or choose another source. Movement uses the common route/traffic service, and the caller retains responsibility for dispatch flush and journal settlement/acknowledgement. The adapter is not yet registered as a colony hauling feature.

Validation: all 310 unit tests passed in 2.96s; quality passed (134 production files, zero Lizard violations). The real-engine transfer-confirmation fixture now uses this adapter instead of directly issuing test actions: requested maximum 30 is clamped to explicit delivery 10, yielding the same verified stores and single receipt. Evidence: artifacts/engine-bQih2f/evidence.json. Native long-distance transfer travel, pickup, task/request selection and end-to-end hauling recovery remain required; full engine suite not rerun for this increment.

## Ordered hauling settlement
The application settlement helper binds a persisted attempt to its exact home/request-owner/request-ID in addition to unit, endpoint and resource. A request sharing the same endpoints cannot claim another request's delivery. Native transfer commands may carry this binding into the journal; hauling settlement requires it, while generic native confirmation fixtures remain unbound.

Settlement persists observed evidence, commits a positive delivery receipt, invokes idempotent reservation/cargo reconciliation, and only then acknowledges the journal. Interrupted receipt writes or reconciliation leave evidence available for replay. Receipt identity prevents duplicate accounting; acknowledgement suppresses subsequent settlement callbacks. Unknown outcomes reach reconciliation without fabricating receipts. The reconciliation callback must derive desired reservations from confirmed/current state rather than decrement quantities blindly on every replay.

Validation: 315 unit tests passed in 2.99s; quality passed (135 production files, zero Lizard violations). Fault-injection tests interrupt receipt writes and reconciliation and verify recovery; additional tests reject different request identities even with identical endpoints. No engine rerun for this application settlement layer. A full persistent hauling task still needs to connect settlement, booking, action dispatch and cancellation/cargo recovery; this helper is one component of that integration.

## Assigned hauling work cycle
runHauling now joins request lookup, durable settlement, quantity booking and an injected native execution port for one assigned request. Cargo determines collection versus delivery. Receipt processing precedes reservation reconciliation and journal acknowledgement; completion releases task-scoped quantities. Binding, endpoint and native dispatch remain explicit caller ports, so the cycle owns no path cache or spawn machinery.

The six-tick --hauling-cycle engine scenario reconstructs services each tick, admits 10 against a nearly full sink, withdraws/delivers that quantity, waits with the sink full, then admits and delivers the remaining 20 after the fixture simulates external consumption. Exact outstanding quantities: 30/30/20/20/20/0. Native stores and two persisted receipts prove 30 total delivery. All quantity claims are gone on completion. This uses the production cycle and native transfer adapter, not a hand-scripted sequence of native actions.

Explicit unfinished recovery: unknown transfer evidence returns transfer-evidence-lost; cancelled/expired work with remaining cargo returns orphaned-hauling-cargo. These prevent fabricated completion but require a policy to salvage/retarget cargo. Automatic assignment, persistent task registration, room request generation, population demand and main-loop activation are still pending. The scenario is controlled adjacent-container work, not a self-sustaining colony or multi-room hauling proof.

Validation before full-engine run: 317 unit tests passed in 2.94s; quality passed (136 production files, zero Lizard violations); targeted engine evidence artifacts/engine-E4yhMp/evidence.json passed. Both unit and native cases verify waiting for sink capacity and completion cleanup; cancellation-with-cargo is covered by the unit cycle test.

Full engine validation: all 35 cases passed in 33.42s.

## Persistent hauling tasks
Hauling work now has a validated payload (home, native unit identity and request) and a shared-task-framework behavior. Admission preserves existing queues, rejects inactive or endpoint-mismatched requests, and requires a caller-supplied unique task ID. Native unit identity prevents a replacement creep with the same name from inheriting the prior worker's hauling task. Existing request and quantity identities remain independent from task identity.

Continuous blocked outcomes are retained as running work instead of spending the generic retry allowance on normal capacity waits. Explicit terminal failures and task expiry still use shared cleanup. Recovery-policy gaps remain: task expiry/cancellation with cargo and unknown evidence must feed salvage/retarget behavior before colony activation; preserving the task is not a complete recovery strategy.

The native hauling-cycle scenario now admits and runs persisted haul tasks, reconstructs the behavior/runner every tick, and still verifies two deliveries around a full-sink wait. Completion leaves the task queue empty as well as releasing quantity claims. No separate hauling movement implementation was introduced.

Validation: 318 unit tests passed in 2.99s; final quality checks passed (138 production files, zero Lizard violations); updated native hauling-cycle scenario passed (artifacts/engine-HKcAKR/evidence.json). Full engine suite was not rerun for this task binding increment. Automatic selection among requests, native endpoint observation composition, population policy and main-loop registration remain pending.

## Native hauling composition

The native hauling task now composes endpoint observation, request-bound journaling, transfer execution and the shared action/movement services in production code. The six-tick engine hauling fixture uses this composition instead of supplying its own endpoint logic. Visible moving targets use their current position when approached.

Endpoint observations handle resource drops, structure/dead-object withdrawal and valid delivery stores. Missing endpoints expose no stock/capacity. General-purpose stores share one capacity pool across resources; specialized stores separate resource compartments, with one mineral compartment for labs. This prevents capacity overbooking but does not yet provide exclusive mineral-type scheduling for an empty lab; that policy remains part of lab integration. Unseen endpoint navigation and cargo recovery remain unfinished.

Validation: npm run quality passed (140 production files, 130 test files, zero Lizard violations); npm test passed 321 tests across 99 files in 3.07 seconds; npm run test:engine -- --hauling-cycle passed with evidence artifacts/engine-ndDOnE/evidence.json. This proves the assigned native task cycle, not automatic courier population, request generation or full logistics parity.

## Reservation-backed request selection

Idle, empty couriers can now select pending requests in priority order through selectHaulingTask. Unavailable requests are skipped; admission reserves request quantity, source stock and sink capacity before another courier can select competing work. Existing task queues are preserved, and failed task writes release the admission reservation. The ordinary cycle renews the same task-scoped booking. Selection intentionally leaves loaded idle units to the still-pending cargo recovery policy.

The engine hauling fixture now selects its request through this production admission path. Validation: npm run quality passed (141 production files, 131 test files, zero Lizard violations); npm test passed 324 tests across 100 files in 3.19 seconds; npm run test:engine -- --hauling-cycle passed, artifacts/engine-ESu19p/evidence.json. Competing admission and task-write failure are unit-tested; native multiple-courier behavior remains a separate outstanding scenario. Production room registration, request generation, courier population, pickup indivisibility-aware selection and cargo recovery are not yet complete.

## Production room registration

The main loop registers a configuration-controlled logistics feature alongside mining and shares the application action arbiter, movement flush and creep maintenance definitions. logisticsEnabled defaults to false and follows normal configuration precedence. When enabled in an owned room, it runs non-spawning couriers whose population.home matches the room and population.owner equals logistics:<JSON room name>. Unrelated creeps are not adopted. Requests are still supplied explicitly; automatic economy request generation and courier spawning remain outstanding.

The six-tick hauling engine fixture now sets configuration and population identity, submits a request, and calls the actual production loop. It no longer constructs a separate task runner or movement dispatcher. Its native stock/delivery/receipt/task cleanup assertions remain intact. Unit tests verify disabled and unowned rooms do not activate dispatch and miners, visitors and spawning couriers are excluded.

Disabling the feature suspends task execution. Disabling between an accepted transfer and its next-tick confirmation can lose the narrow confirmation window; uncertain-transfer/cargo recovery is still an explicit unfinished requirement, not a completed pause/resume guarantee.

Registration validation: npm run quality passed (142 production files, 132 test files, zero Lizard violations); npm test passed 325 tests across 101 files in 3.09 seconds; npm run check:bundle passed; npm run test:engine:suite passed all 35 scenarios in 36.93 seconds (artifacts/engine-suite.json). Targeted production-loop hauling evidence: artifacts/engine-3XFUw9/evidence.json.

## Generated owned-room energy requests

energyRequestsEnabled (default false, requires logisticsEnabled) observes containers and owned storage/terminals as energy sources and owned spawns/extensions as sinks. Generation is a separate policy from native observations and task execution. It runs after couriers so settled receipts are reflected before creating fresh work. Pending requests retain identity and block duplicate sink work; their outstanding quantities reduce planned source availability. This is conservative when some requested energy is already in transit.

Initial policy: spawns before extensions, nearest source by geometric range with deterministic ID ties, at most ten new requests per tick, 200 energy per request, 100-tick expiry. The generator takes an injected policy object. Queue retention capacity applies backpressure instead of throwing when 200 unexpired records are retained. This first policy does not yet include tower thresholds, links, storage/terminal balancing, scavenging or mineral delivery, and geometric range is not a path-cost/reachability proof. Courier spawning and expired/cancelled cargo recovery remain required.

Porting reference: legacy role.distributorV2.js and role.courierV3.js confirm spawn/extension delivery and storage/terminal collection as existing capabilities. Their broader fallback and balancing behavior is not claimed complete here.

Validation: npm run quality passed (144 production files, 134 test files, zero Lizard violations); npm test passed 327 tests across 102 files in 3.13 seconds. New --energy-logistics native scenario passed: production observations generate a 30-energy request, the assigned courier withdraws and delivers it to an extension, one receipt is recorded, and task/reservation state clears. No request is seeded by the fixture. Evidence: artifacts/engine-3dNRGq/evidence.json. The fixture still seeds its courier; this is not population or complete colony-economy evidence.

## Courier capacity and native bootstrap

applyCourierDemand reconciles carry capacity rather than unit counts. Its target is the greater of an explicit minimum and the sum of per-route production times round-trip duration divided by utilization. Live capacity excludes workers within replacement spawn/travel/margin lead time; spawning workers count, while their observed names remove duplicate pending requests. Pending bodies contribute their own capacity, excess requests are cancelled by owner, and persistent spawn identities prevent reuse. Native observations supply actual store capacity; planned bodies use their CARRY count.

courierSpawningEnabled (default false, requires logisticsEnabled) now bootstraps a courier for pending room work through this reconciler and the shared spawn dispatcher. courierBodyBudget defaults to 300, accepts integer budgets 100..2600, and uses current available room energy when no courier exists. The native bootstrap currently supplies an empty route list and a one-body capacity floor while work is pending; measured station-route throughput integration is still required for sustained and remote sizing. Replacement travel is initially 25 ticks plus a 10-tick margin, not yet a measured route. Disabling logistics/spawning cancels only its queued spawn requests, leaving live units and other population owners intact.

Native --courier-bootstrap evidence starts with no couriers and no requests. The production loop generates work, spawns exactly one CARRY/MOVE courier, travels, collects and delivers 30 energy, records the receipt, and leaves no queued spawns after 30 ticks. This proves autonomous delivery bootstrap, not a self-sustaining mining/hauling colony or final throughput parity. Evidence: artifacts/engine-ZsjI0o/evidence.json.

Unit validation: 329 tests across 103 files passed in 3.14 seconds, including mixed live/pending capacity, spawning-name deduplication, replacement timing and scoped cancellation. Quality passed with 147 production files, 136 test files and zero Lizard violations; bundle validation passed.

Full integration regression: npm run test:engine:suite passed all 37 scenarios in 39.93 seconds; report artifacts/engine-suite.json.

## Native station route sizing

Native courier demand now receives individual routes for currently observed safe energy stations with containers and no active mining link. Production is capped by both station regeneration throughput and assigned, non-spawning miners' active/boosted harvest potential. Each route uses its own full-load path to the selected sink and empty return path, two service ticks and an initial two-tick delay allowance. Demand sums these contributions with 0.8 utilization; the pending-work bootstrap floor remains. Replacement lead time uses the maximum complete empty path from the room's spawns to its included stations, plus the existing margin.

The reusable native estimator uses planned body mobility, shared static matrix snapshots and bounded path caching. Cache keys include topology and body-dependent costs. Incomplete paths and unseen/cross-room routes are not represented as zero-cost success. These are static terrain/load estimates, not observed traffic timings. Current sink selection follows the first pending source request or falls back to the first owned spawn; multiple destinations, remote routing, link overflow, unavailable-route diagnostics and pending-work-only replacement travel still need refinement. Stations without current vision are not used for throughput demand.

Validation: 331 unit tests across 104 files passed in 3.29 seconds. New --courier-routes real-engine scenario verifies one station at 2 energy/tick, empty travel 8 ticks, loaded swamp travel 90 ticks, replacement travel 9 ticks and 255 required carry capacity. Adding roads changes loaded travel to 9 ticks and required capacity to 52.5 without a global reset; topology-aware cache invalidation is exercised. Evidence: artifacts/engine-dzepqv/evidence.json. This scenario observes native route costs; it does not claim observed creep transit times or sustained throughput. Added to the engine suite, now 38 scenarios.

## Combined mining and hauling bootstrap

The --colony-economy native regression starts with no creeps, one source and an empty source container. It enables mining, generated energy requests and courier spawning through the production loop (200-energy miner and 100-energy courier budgets). Over 100 engine ticks it must create both populations, confirm at least 100 energy delivered back to the spawn, and finance a second miner from returned energy. No resource refills, requests or worker actions are injected.

At the midpoint the harness updates the actual code module and invalidates the engine code cache. A reload witness must record the expected tick, and confirmed delivery must continue afterward. Evidence: artifacts/engine-it5zm3/evidence.json. Quality passed with 150 production files, 139 test files and zero Lizard violations. The scenario joins the full engine suite (39 cases); the full suite was not rerun for this test-only increment.

This is a bounded bootstrap/reinvestment regression. It does not cover creep lifetime replacement, source regeneration cycles, indefinite memory growth, cargo recovery or full self-sustaining colony behavior. Test history contributes deliberately growing evidence memory and is not a production memory profile. ED-21 and the later parity/performance/soak gates remain open.

## Empty-source assignment recovery

After settling any pending transfer evidence, an empty courier now completes its assignment when the observed source stock reaches zero. Task-scoped reservations are released, but the request's undelivered balance remains pending for future supply or expiry. Admission skips that empty source, allowing another available request to be selected next tick. A courier with cargo still follows its existing delivery obligation even when its source disappears or is emptied. Unknown transfer evidence remains blocked rather than being treated as a successful delivery.

The six-tick --empty-source native regression removes the remaining source stock after the courier's first withdrawal. The courier delivers its 50 units, releases the original assignment, selects an alternate source and delivers another 20. The two requests record exactly 50 and 20 delivered, respectively, and the task queue and quantity reservations are empty at the end. Original outstanding quantity is not falsely completed. Evidence: artifacts/engine-2133Wt/evidence.json.

Validation: 333 unit tests across 104 files passed in 3.21 seconds; quality passed (150 production files, 140 test files, zero Lizard violations). Transfer settlement was extracted from the hauling decision function to retain low complexity. This resolves assignment starvation from empty sources; expired/cancelled loaded cargo, missing sinks and uncertain transfer recovery still require implementation.

Full engine regression passed all 40 scenarios in 45.71 seconds (artifacts/engine-suite.json).

## Cancelled-cargo recovery

A cancelled request with carried resources now fails its assignment after settling available transfer evidence. The native logistics loop can then admit a separate recovery request for an idle loaded courier. This request has its own identity and receipts, reserves only request quantity and destination capacity, and is sized to currently reservable capacity. Existing tasks, pending journal attempts and unknown results prevent takeover. Multiple resources are recovered one at a time; no resource drop is issued.

Native recovery prefers owned storage, then terminal, then energy spawn/extension consumers, then containers. When no suitable capacity exists, cargo stays with the courier. Recovery does not count as fulfillment of the abandoned request. Expiry that removes a task before its pending transfer is settled, uncertain evidence, missing/full live-task destinations and journal cleanup still require additional recovery work.

The --cargo-recovery real-engine scenario cancels a 30-energy request immediately after withdrawal. The original destination remains empty and its cancelled request has no receipts; a separate recovery request delivers all 30 energy to storage, confirms one receipt and clears task/reservation state. Evidence: artifacts/engine-X4tyys/evidence.json. Unit tests additionally verify partial shared capacity (20 + 5), no competing third admission, and refusal to overwrite pending/unknown journals.

Validation: 335 tests across 105 files passed in 3.43 seconds; quality passed (152 production files, 142 test files, zero Lizard violations). Ordinary --hauling-cycle and combined --colony-economy regressions also passed after the integration, evidence artifacts/engine-3TBI5g/evidence.json and artifacts/engine-fQVVQb/evidence.json. Full 41-case engine suite was not rerun this increment.

## Settlement before expiry

The native logistics loop now settles the previous transfer using the current task's validated request binding before invoking the generic task executor. The executor can then remove an expired task without losing the journal's matching context. Settlement releases old task-scoped quantity promises; active tasks rebook from current observations when they execute. Already-acknowledged attempts are not replayed, and unknown results remain explicitly unknown.

The --expiry-recovery native scenario accepts a withdrawal on the request/task's last active tick. At expiry the withdrawal is confirmed and acknowledged before task removal. On the next tick an independent recovery task delivers all 30 energy to storage and records its own receipt; no tasks or quantity claims remain. Expired request records are pruned when the recovery request is submitted. Evidence: artifacts/engine-nMPZ6H/evidence.json.

Validation: 336 unit tests across 106 files passed in 3.19 seconds; quality passed (153 production files, 144 test files, zero Lizard violations). This covers timely withdrawal confirmation at expiry, not missed event windows or journals whose original task binding was already removed. Request receipt acceptance still follows request expiry policy; late delivery attribution and unknown-result resolution remain separate accounting/recovery work.

Full regression: all 42 engine scenarios passed in 47.42 seconds (artifacts/engine-suite.json).

## Unknown transfer outcomes

When transfer evidence is missed, recovery now archives the uncertain attempt with its original request, task scope, observation tick and current cargo. It then cancels the affected request, releases its quantity promises, and retires the acknowledged unknown journal entry. The original request is never credited from cargo loss or current stock. Its owner must regenerate demand from current observations; an external one-off request remains cancelled rather than blindly retrying its original quantity. Cargo still held can enter the independent recovery path on the next tick.

Writes are ordered archive, cancellation, reservation release, journal retirement. A failure before retirement leaves the unknown attempt available for retry, and incident insertion is idempotent. Retention is ten detailed incidents per unit with a count of discarded older details. This bounds per-unit history, not total memory over dead unit identities; lifecycle cleanup and operator presentation remain outstanding. Requests whose original task binding has already disappeared still need reconciliation.

Native --unknown-recovery deliberately skips the withdrawal-confirmation tick: the unknown attempt is archived, its original request receives no receipt, and 30 carried energy reaches recovery storage with a separate confirmed receipt. Evidence artifacts/engine-xNun84/evidence.json. Native --unknown-delivery skips delivery confirmation: the destination contains the delivered 30, but no receipt is invented and no duplicate delivery is issued; one uncertain transfer with observed cargo zero is retained. Evidence artifacts/engine-3sU6ek/evidence.json. --expiry-recovery also passed, artifacts/engine-mCjhyD/evidence.json.

Validation: full unit suite passed 338 tests across 107 files in 3.25 seconds before adding the retention-bound assertion; targeted uncertainty tests plus smoke then passed four tests in 212ms. Quality passed with 155 production files, 147 test files and zero Lizard violations. Full engine suite now has 44 scenarios and was not rerun this increment. These changes restore safe forward progress after known-task evidence loss; they do not reconstruct unknowable historical delivery amounts.

## Destroyed delivery destinations

Hauling tasks retain the observed room of stationary delivery structures. If that room is visible and the structure no longer exists, the task cancels its request and releases reservations after settling any pending transfer evidence. Loaded couriers then enter independent cargo recovery; no delivery receipt is invented for the destroyed destination. Unknown room visibility remains a wait, and mobile destinations do not persist a room as proof of destruction. Existing task payloads without this optional observation remain compatible and conservative.

Native --missing-sink removes the destination container after a successful withdrawal. The courier preserves all 30 energy, recovers it into owned storage, records only the recovery receipt, and leaves no task or quantity claims. The four-tick stock history is asserted explicitly. Initial evidence: artifacts/engine-SMf4Vc/evidence.json. Full-sink alternatives, scavenging admission, and the broader ED-21 policies remain outstanding.

Validation: 342 unit tests across 107 files passed in 3.19 seconds; quality passed with 155 production files, 148 test files and zero Lizard violations. The packaged bundle check passed. All 45 native engine scenarios passed in 50.14 seconds (artifacts/engine-suite.json), including expected-error and timeout detection.

## Indivisible pickup admission

Native pickup has no amount parameter. Dropped-resource observations therefore expose a minimum collection quantity equal to the smaller of current drop stock and free cargo capacity. Collection reservations must cover that entire amount across request quantity, source stock and destination capacity. Impossible partial bookings are skipped during admission, allowing lower-priority feasible work to proceed. If a drop grows while a courier is assigned and the new amount no longer fits, the empty courier releases the assignment and its reservations without cancelling or crediting the request. Store withdrawals remain divisible; loaded delivery ignores the collection minimum.

Unit coverage includes partial sink capacity, competing couriers, growing drops, and native observation amounts. The --pickup-admission engine scenario gives an impossible high-priority request for 10 energy and a feasible request for 50 from the same drop. It proves pickup, next-tick confirmation, delivery of exactly 50, no receipt for the partial request, and empty task/reservation queues. Evidence: artifacts/engine-s4igsZ/evidence.json. The initial fixture run incorrectly seeded another courier every tick; that fixture defect was corrected before the passing run.

Validation: 346 unit tests across 107 files passed in 3.26 seconds; final quality passed (155 production files, 149 test files, zero Lizard violations), smoke passed in 163ms, and the packaged native pickup scenario passed. The full engine suite now includes 46 scenarios; it was not rerun this increment. Automatic scavenging source discovery/priorities and broader resource policies remain outstanding; this establishes correct admission and actual pickup execution for explicit requests.

## Automatic energy recovery from remains

Owned-room automatic energy supply now observes tombstones and ruins as withdrawal sources. Source priority is honored before distance, then stable ID breaks ties: tombstone (-2), ruin (-1), ordinary container/storage/terminal (0). Sink priorities and bounded request generation remain unchanged. Source observation is separate from request selection and execution; these endpoints are never introduced as delivery sinks by this adapter.

Legacy reference: role.scavenger.js getScavengeTarget prefers tombstones before non-essential stored energy. This increment ports that energy-source behavior through the shared logistics framework and adds ruins. It does not complete starvation-mode scavenger parity: dropped-resource discovery, storage/terminal recovery destinations, non-essential lab/link stripping policy and room-recovery activation remain outstanding. Explicit dropped-resource requests already have native pickup evidence, but are not yet generated automatically.

Native --remains-supply seeds a courier and recoverable stores, with no pre-seeded logistics requests. The production loop generates requests, withdraws 30 energy from a tombstone and 20 from a ruin, confirms both deliveries into an extension, and leaves ordinary container energy untouched. Exact seven-tick stock history, receipts [30,20], empty task queue and empty reservation ledger are asserted. Evidence: artifacts/engine-KRlwIX/evidence.json. Existing --energy-logistics passed again: artifacts/engine-MkDNlp/evidence.json.

Validation: 348 unit tests across 108 files passed in 3.18 seconds. Final quality passed (155 production files,151 test files,zero Lizard violations), smoke passed in 158ms, both relevant packaged engine scenarios passed. The full suite now lists 47 scenarios; it was not rerun this increment. Expired/disappeared source request reconciliation and non-energy scavenging remain outstanding.

## Reconciliation of abandoned automatic sources

Automatic energy generation now reconciles its own pending energy requests against the complete owned-room source observation before budgeting new work. Requests whose source is missing or empty are cancelled only when no active quantity reservation references their request pool. This protects reserved collection/delivery, including cargo already in transit, while allowing abandoned demand to regenerate immediately from other stock. Other owners and resource types are untouched. No receipt is fabricated, and cancelled request identities remain retained by the queue's existing expiry policy.

The caller must provide a complete room observation: this is not a remote unseen-room deletion rule. In native composition the owned room is visible, courier settlement/execution precedes generation, and current reservations represent ongoing work. If a courier cannot maintain a reservation, existing cancellation/cargo-recovery behavior handles carried resources independently.

Native --source-loss removes the original source container after automatic request generation and substitutes another source identity. The obsolete request is cancelled, a new request is generated, and exactly 30 energy is delivered with one confirmed receipt. Six-tick stock history and empty task/reservation queues are asserted. Evidence: artifacts/engine-67yvqj/evidence.json. Unit tests cover replacement, in-flight reservation protection and owner isolation.

Validation: 350 unit tests across 109 files passed in 3.18 seconds; quality passed (156 production files,152 test files,zero Lizard violations). All 48 engine suite checks passed in 53.40 seconds, including negative error/timeout sentinels (artifacts/engine-suite.json).

## Automatic dropped-energy supply

Dropped energy now precedes tombstones, ruins and ordinary stored sources when a feasible batch fits. Source observations carry a minimum batch for indivisible pickup. Generation checks this against available stock, sink deficit and request maximum, falling back to divisible sources for smaller deficits. Native composition uses the smallest positive current courier capacity; without couriers it uses the currently affordable configured courier recipe. Admission still checks the individual courier's actual free capacity and reservations, so larger couriers cannot over-collect a smaller courier's request. No feasible body/capacity means drops are deferred.

Unreserved automatic requests whose outstanding quantity falls below the newly observed minimum batch are cancelled and regenerated. This handles growing piles and capacity changes without inventing receipts. Reserved work retains its existing protection. The generator remains bounded to spawn/extension deficits; preservation of excess drops into storage/terminal, minerals, and starvation-specific policies remains future work.

Native --drop-supply seeds a 1000-energy pile, a 50-capacity courier and an empty extension, with no logistics requests. The production loop generates and confirms one 50-energy delivery, leaving container stock untouched and no task/reservation behind. Final evidence: artifacts/engine-pbQVIJ/evidence.json. Existing courier bootstrap also passed (before the final stale-batch reconciliation extension), artifacts/engine-3BTziE/evidence.json.

Validation: final quality passed (157 production files,152 test files,zero Lizard violations); 353 tests across109 files passed in3.32s; smoke passed155ms; final native drop-supply scenario passed. Suite now contains49 scenarios; full suite was not rerun this increment. Native energy generation composition is extracted into app/native-energy-supply.ts.

## Large and mixed courier pickup capacity

Native energy request limits now use max(200, feasible pickup capacity). The former fixed 200 limit made a 250-capacity courier unable to collect a large pile even for an empty 300-capacity spawn. Generation remains bounded by actual source stock and destination deficit. Mixed fleets still size the minimum batch from the smallest positive courier capacity; a larger courier cannot claim that indivisible pickup unless its actual amount fits, leaving the request for the smaller courier.

Native --large-drop proves a 250-capacity courier automatically collects and delivers 250 energy to a spawn from a 1000-energy pile. Its exact observed spawn totals include passive native regeneration (0,0,1,252,253), while the sole delivery receipt remains exactly250. No task or claims remain. The first assertion expected no passive regeneration; it was corrected to account for engine behavior without increasing the delivery receipt. Evidence: artifacts/engine-iCkM1x/evidence.json.

Validation: targeted admission plus broad smoke passed7 tests in233ms, including mixed-capacity admission. Final quality passed (157 production files,153 test files,zero Lizard violations). The new native scenario passed. Full unit and engine suites were not rerun for this focused correction; engine suite now lists50 scenarios. Remaining scope from the preceding sections is unchanged.

## Resource preservation policy

The new preservationEnabled configuration flag defaults to false and is independently configurable from energyRequestsEnabled, while logisticsEnabled still gates the room feature. Preservation observes only dropped resources, tombstones and ruins; ordinary containers/storage/terminals are never source candidates, preventing storage-to-storage preservation loops. Owned storage is preferred, with owned terminal fallback. Minerals use the same request, reservation, transfer and receipt machinery as energy.

Native composition generates urgent spawn/extension requests first. Preservation then subtracts all pending work from per-source/resource stock and shared destination capacity, across owners and resources. Priority10 leaves urgent supply ahead of preservation. Request count/lifetime/quantity remain bounded, and indivisible drops require a fitting minimum batch. Current sink headroom is budgeted across all resource types in the same generation pass. Stock in transit is handled conservatively through pending quantities; this is not a maximum-throughput allocator.

Native --preservation creates no seeded requests and enables preservation without automatic energy supply. It recovers20 energy and30 hydrogen from a tombstone into owned storage, verifies exact delivery receipts, and leaves no task/reservation. Ordinary container energy remains30. Evidence: artifacts/engine-EhQ7IO/evidence.json. Unit tests cover shared capacity, terminal fallback, duplicate suppression, urgent source allocation, indivisible pickups and source/sink ownership boundaries.

Remaining: preservation-specific stale-source/decay reconciliation, active full-destination reassignment, retention/late-receipt accounting, and starvation/link policies are not yet complete. In this initial policy, an uncollectable residual preservation request can remain pending until its100-tick expiry; no receipt is invented for it. Tests above do not establish full ED-21 parity.

Validation: full unit suite passed356 tests across110 files in3.28s before the final source-eligibility adapter test; targeted preservation, adapter and smoke then passed4 tests in196ms. Final quality passed (159 production files,156 test files,zero Lizard violations). All51 engine checks passed in55.37s (artifacts/engine-suite.json), including error and timeout sentinels.

## Preservation decay reconciliation

Source reconciliation is now shared by energy supply and preservation through a resource-aware helper. Stock identity includes both source ID and resource, so energy remaining in a tombstone cannot keep a depleted mineral request alive. Each policy reconciles only its owner; energy additionally filters to energy requests. Active request-pool reservations protect collection/delivery. Unreserved missing/depleted sources and infeasible minimum batches cancel promptly without invented receipts. Reservation pools are indexed once per reconciliation pass.

This supersedes the initial preservation limitation above requiring residual demand to wait for100-tick expiry. Complete visible-room source observations are still required. Full-destination reassignment, other lifecycle/accounting gaps and remaining ED-21 parity remain outstanding.

Native --preservation-decay activates the room before any creep intent, then lets a tombstone decay naturally into a hydrogen drop. The original source request cancels; the replacement drop yields29 hydrogen after native decay, and only that29 is credited. The remaining1-unit demand cancels, with no tasks/claims left. Evidence: artifacts/engine-1PeLaD/evidence.json. Earlier fixture attempts did not activate the idle room, allowing withdrawal before decay; activation corrected the intended timing. Existing --source-loss also passed, artifacts/engine-Qumiav/evidence.json.

Validation: quality passed (160 production files,156 test files,zero Lizard violations);359 unit tests across111 files passed3.28s; smoke passed154ms; both relevant native scenarios passed. Full engine suite now includes52 scenarios and was not rerun this increment.

## Full delivery destinations

After settling prior transfer evidence, a loaded hauling task now cancels its request when its destination is currently visible and has zero free capacity for that resource. The task releases its reservations and fails into independent cargo recovery. This policy redirects immediately rather than waiting for the original destination to reopen. An unseen destination still waits; an empty courier retains its capacity wait. Reservation contention alone does not trigger redirection when observed free capacity remains positive. Automatic request owners can regenerate demand from observations; explicit cancelled requests are not silently retargeted or falsely credited.

Unreserved preservation requests also reconcile their delivery sinks before new generation. Full or unavailable durable destinations release obsolete demand, allowing the same source to generate terminal work immediately. Active reservation claims retain protection; loaded tasks handle observed-full recovery through the execution path.

Native --full-sink fills a destination container after pickup. The original request receives no receipt; all30 carried energy reaches storage through an independent recovery request, with exact four-tick stock history and no task/reservations left. Evidence: artifacts/engine-T1kUra/evidence.json. Existing partial-delivery/wait scenario --hauling-cycle passed (artifacts/engine-yGq4YT/evidence.json), as did --preservation (artifacts/engine-DlFgM3/evidence.json). Unit coverage includes immediate unassigned storage-to-terminal fallback.

Validation: final quality passed (161 production files,156 test files,zero Lizard violations);362 unit tests across111 files passed3.23s; smoke153ms;three relevant native scenarios passed. Full engine suite now lists53 scenarios and was not rerun this increment. If all alternatives are full, recovery retains cargo until space is available; no resources are intentionally dropped. Partial free capacity continues to use bounded delivery batches. Broader link/starvation policies and late-receipt/lifecycle accounting still remain.

## Delivery confirmation at expiry

Confirmed delivery eligibility now uses the recorded intent issue tick rather than the later observation tick. Settlement supplies the journal's issue tick only after obtaining an observed transfer result with the validated request binding. Unknown outcomes still produce no receipt. The queue validates that issue time is not in the future and rejects intents issued at/after request expiry. Existing callers that omit issue time retain their prior immediate-confirmation semantics.

Request records remain retained through their expiry tick; pending work still expires at the original deadline. This one-tick retention protects last-valid-tick settlement from unrelated request submission/pruning earlier in the same room loop. Queue capacity accounts for retained records, so backpressure lasts one additional tick rather than allowing over-capacity writes. Receipt idempotency and cancellation semantics remain unchanged. This does not reconstruct evidence missed beyond its native observation window or restore records already pruned before a delayed recovery.

Native --expiry-delivery withdraws30, issues its delivery on the last valid request tick, and confirms the30 receipt at expiry. Exact stock history and empty task/reservation queues are asserted. Evidence: artifacts/engine-a60k2q/evidence.json. Unit coverage also submits another request on the expiry tick before confirming the original, checks replay rejection and rejects an intent issued at expiry.

Validation:363 unit tests across111 files passed3.28s;final quality passed161 production/157 test files with zero Lizard violations;smoke162ms;all54 engine suite checks passed57.60s (artifacts/engine-suite.json).

## Distributor tower supply

Ported the active role.distributorV2.js evaluateTowers trigger: refill owned towers strictly below40% energy. towerRefillFraction is now a validated0..1 runtime setting, default0.4;0 disables new tower requests and1 permits refill below full. energyRequestsEnabled and logisticsEnabled retain their existing gates. Requested quantity uses actual free capacity and the ordinary bounded batch/stock budget, so an accepted batch can cross the trigger threshold, matching the legacy trigger-versus-delivery distinction.

Tower energy consumers use priority2 after spawn0 and extension1. This is an explicit owned-economy ordering; threat-aware emergency reprioritization and tower combat execution belong to the later defense policy, not this supply adapter. Existing requests keep their identity and are not repeatedly recreated while waiting. Enemy towers are excluded. Observation extracts consumer demand independently from source selection and hauling execution.

Native --tower-supply seeds no requests and delivers30 energy to a tower starting at390, ending420. Exact five-tick history, priority2, receipt30 and empty task/reservation queues are asserted. Evidence: artifacts/engine-kFBKOx/evidence.json. Unit tests cover strict threshold boundary, disabled/configured thresholds and ownership.

Validation:364 unit tests across111 files passed3.34s;final quality passed161 production/158 test files,zero Lizard violations;smoke151ms;native tower scenario passed. Full engine suite now lists55 scenarios and was not rerun this increment. ED-21 still requires link-role policy, remaining courier/distributor fallbacks and lifecycle/multicourier acceptance evidence.

## Link routing and native execution

linksEnabled defaults false and enables native link execution within owned-room logistics. Responsibilities are separated into observed link snapshots, pure role classification, pure transfer planning and action-arbitrated native dispatch. Geometry follows legacy controller.js runLinks: sources within2, storage within3, controller links within2, remaining links as relays. Classification sorts stable IDs; nearest eligible storage link wins. Source roles take precedence and are exclusive, correcting legacy overlap/self-transfer ambiguity. Missing storage/sources are safe. Explicit role overrides remain future configuration work.

Planning retains the legacy priorities: controller below75% when storage has energy, recruiting the storage link below50%; otherwise a relay below500, then storage fallback. It skips inactive/cooling/self/duplicate sources. Per-tick gross transfer amounts share one receiver free-capacity budget; native rounded loss is reported as expectedReceived only, not a confirmed receipt. Loss-freed capacity is not reused until a later tick, avoiding dependence on native intent processing order. Native adapter supplies LINK_LOSS_RATIO and uses the shared action arbiter. No link delivery is counted from accepted intent alone.

Native --link-supply runs the production room loop with two full source links and an empty storage link. It verifies source/sink histories [800,800,0]→[0,800,776]→[0,776,799], proving capacity budgeting and rounded losses over two transfers. Evidence: artifacts/engine-2UM08j/evidence.json. Initial fixture ordering assumed coordinate order while policy uses IDs; evidence ordering was corrected, and the planner was tightened to gross-budget allocation during review. Pure tests cover deterministic roles, missing structures, competing sources, controller/storage assistance, cooldown, self-transfer, relay priority and saturation.

Validation:368 unit tests across112 files passed3.28s;quality passed166 production/160 test files,zero Lizard violations;native link scenario passed. Earlier focused planning+smoke passed5 tests in244ms before native integration; full unit run includes smoke afterward. Full engine suite now lists56 scenarios and was not rerun this increment.

ED-21 is not complete: courier servicing of storage/controller links, cross-mode resource coordination, structured link outcome accounting, configurable role/threshold overrides, remaining fallback policies and acceptance scenarios still need work. The new flow is opt-in and has not been deployed live.

## Layered link thresholds

Native link planning now consumes the effective room configuration: linkControllerTrigger (default0.75, range0..1), linkStorageAssistTrigger (default0.5, range0..1), and linkRelayTrigger (default500, integer0..800). These are strict below-threshold triggers;0 disables the corresponding demand/assistance condition. Storage assistance still requires controller demand to be selected, so raising assistance above the controller trigger does not create independent demand. Geometry roles and native LINK_LOSS_RATIO remain separate from these policy settings.

Native --controller-links starts with controller routing disabled (threshold0), then changes it to0.75 through persistent operator configuration. No first-tick intent occurs; the next tick routes800 from a source to the controller link, yielding776 after loss. Further transfers stop above the trigger. Exact source/storage/controller histories verify that the full storage link remains untouched. Evidence: artifacts/engine-RSovo8/evidence.json. Configuration tests verify room override precedence and reject out-of-range/fractional relay values. Native storage assistance and explicit role overrides remain separate evidence/work.

Validation:369 unit tests across112 files passed3.47s;quality passed166 production/161 test files,zero Lizard violations;native controller-routing scenario passed. Full unit run includes smoke. Full engine suite now lists57 scenarios and was not rerun this increment. Remaining ED-21 scope is unchanged except these threshold controls are now implemented.

## Courier link-service decision port

Ported role.distributorV2.js evaluateLinks into a pure planLinkService policy. It chooses at most one direction: when an active controller link is below the configured need threshold, fill an under-target storage link; otherwise drain a storage link strictly above target into storage. Need suppresses draining even when the link is above target. Defaults in the tests preserve legacy50% controller need and75% storage-link trigger. Source stock, destination headroom and maximum batch bound quantity. A cooling link remains serviceable by a courier; link transfer cooldown is not a creep withdrawal/transfer cooldown. Missing storage, inactive links and full sinks produce no work.

This is a tested decision module, not yet runtime courier behavior. Before connecting it, native link intents and courier assignments must share stock/capacity reservations; otherwise both can promise the same link energy in one tick. The integration must also cancel obsolete unreserved fill/drain work when direction changes, settle pending evidence first, avoid opposing requests, and prove an actual source-link→storage→controller flow with native scenarios. Existing geometric role classification is reused rather than duplicating the legacy distributor's separate5-range cache.

Validation: quality passed167 production/162 test files,zero Lizard violations; focused link-service, link-planning and smoke passed9 tests in215ms. No new engine scenario or full-suite run was performed because this pure decision module is not wired into runtime yet. ED-21 remains incomplete.

### Shared link/courier reservations
Native link planning now observes the same stock and capacity pools as courier hauling. Actual energy remains the role/threshold input; unreserved stock and capacity bound allocation. Before issuing, the coordinator atomically reserves gross source energy and gross destination capacity until the next tick. Rejection/missing targets release the claim; uncertain exceptions retain it. Re-entry cannot replace or release an already issued claim. Pool identity uses the same native capacity helper as hauling.

Validation: quality passed (168 production files; no Lizard violations); link reservation/planning/service plus smoke tests passed (13 tests, 235 ms). Existing native link-supply and controller-links scenarios passed, evidence artifacts engine-qfmnOd and engine-bYv1Rz. These engine fixtures do not yet prove mixed courier/link contention. Dedicated native contention and courier link service integration remain required for ED-21.

### Native link/courier contention evidence
The packaged `--link-contention` scenario runs two production hauling tasks alongside native links. Tick one reserves a 50-energy withdrawal from the sending link and a 50-energy delivery to the receiving link. Tick two issues both courier operations alongside a bounded 750-energy link transfer. The source ends empty, the receiving link contains 777 (750 minus ceil(22.5) plus 50), and the collecting courier subsequently delivers its 50 to a container. Both requests have exactly one 50-energy receipt and all quantity claims are released. This proves shared source and sink reservation coordination under actual native intent processing, rather than only planner mocks.

Validation: `npm run quality` passed with zero Lizard violations; smoke passed in 158 ms; `npm run test:engine -- --link-contention` passed four ticks (engine-ZIc0ue). The first fixture expectation incorrectly rounded the link loss down; corrected the expectation to match the documented/native ceil loss. No production behavior change was necessary. Scenario is included in the complete engine suite. Courier link-service generation remains pending.

### Automatic courier link servicing
`linkServiceEnabled` (default false), together with `logisticsEnabled` and `linksEnabled`, enables automatic storage-link fill/drain requests. `linkStorageTarget` defaults to 0.75; controller demand uses `linkStorageAssistTrigger`. Requests use priority 3, 200-energy batches, 100-tick expiry and owner `link-service:<room>`. One pending request per owner prevents opposite simultaneous directions. Policy changes cancel unreserved stale work; admitted work is allowed to settle before reversing direction. Disabling service retires unassigned requests while preserving admitted cargo. Actual admission and native link intents share quantity reservations. Courier population provisioning is still governed separately by the existing population policy.

The packaged `--link-service` engine scenario proves automatic storage -> courier -> storage link -> controller link: 200 withdrawn and delivered, then 194 received after native loss, with a confirmed 200-energy courier receipt. Generation precedes courier settlement, so a completed request can defer the next batch until the following tick; this is conservative, not a delivery loss. Native drain-direction and longer-run reversal/recovery coverage remain outstanding.

Validation: quality passed (170 production files, zero Lizard violations); full unit suite 380 tests/115 files passed in 3.44s; native four-tick chain passed (engine-pqodfE). Added scenario to full engine suite, which has not been rerun for this change.
