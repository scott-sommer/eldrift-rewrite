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
