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
