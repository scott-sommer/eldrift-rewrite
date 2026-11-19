# Automatic reservation follow-up audit (planning, not qualification)

Reviewed while clean 672077c construction regression was running. Legacy remains read-only at f2bbf7e8c44addc7c426abb5458e393c9502ff5f.

## Proven existing boundaries

- Native reservation service already consumes typed Reserve demand, shared task/controller/movement owners, live controller identity/ownership and admitted routes; manual native scenario exists. Automatic population and a priced per-room reservation policy are missing.
- Legacy spawner.js reserver recipe (around 958) repeats CLAIM and MOVE up to 8 pairs based on budget, including a MOVE-only fallback at insufficient budget. Active reserver scheduling around 2270 uses ordered reservation targets; the earlier Reserve-flag loop is commented out. Preserve active scheduling and operator flags separately; do not call commented code an automatic capability.
- Pinned engine reserveController.js adds active CLAIM * CONTROLLER_RESERVE; a new reservation starts at gameTime+1. Controller tick clears at gameTime >= endTime-1. One CLAIM cannot build a useful missed-tick/handoff buffer. Reject infeasible/MOVE-only reservation bodies rather than silently pricing them as service. A 2 CLAIM/2 MOVE body costs 1300, with native CLAIM lifetime constraints, not 1500 miner lifetime.
- Source tick changes neutral/reserved capacity independently from stock regeneration. Capacity increase is not instant refill. Keep actual observed sourceFacts.capacity separate from any explicit production projection; current source-admission checks compare actual capacity.
- Existing room commitment fields can carry whole-room energy/spawn/slot overhead exactly once. Portfolio reprices room membership; do not also charge the same reserver in each source reservation share.

## Policy/data seam

Current RemoteManagementPolicy has a single reserve boolean, and commitRemotePortfolio applies it to every selected room's controller. Native policy hardcodes false. Mixed feasible reserved and unreserved rooms therefore need an explicit per-room reservation decision/quote seam, rather than simply toggling the global flag. Any new persisted quote field needs validation, bounded storage and deliberate schema migration/invalidation. Controller travel must be quoted separately from source travel and remain resumable/bounded.

Use a feasible buffered body/controller identity plus actual travel/service/replacement price as a room-level decision. Separate observation, future production assumptions, costs and authority. Operator enablement may require reservation even when evaluating current-capacity economics; do not imply immediate doubled source output. Broader projected yield/startup payback remains an explicit economic obligation.

## Funding and execution

A 1300-energy reserver can consume an entire initial RCL4 spawn budget before miners exist. Stage extraction/transport and physical home redistribution, or refuse the unfunded reservation; do not inject energy during the native run. Existing maintainNativeDistributors uses independent population ownership and existing shared hauling. It must be funded and configured explicitly for a combined scenario. Local storage-to-spawn transfers are redistribution, not another remote income receipt.

Recruitment, final spawn admission and actor service should remain separate. Generation-scoped ownership, shared worker slot reservations, task runner/controller dispatch and safe empty retreat are reusable from current modules; do not duplicate actuator/memory roots. Reservations have no CARRY banking requirement unless deliberately choosing a cargo-capable body. Recheck current controller ownership and threat/vision at service and final spawn, preserve unrelated queue entries, and cancel scoped queued/spawning work on withdrawal.

## Native acceptance still required

- An actually recruited, feasible buffered reserver; actual controller travel, stable buffer growth, natural replacement and missed-tick coverage.
- Profitable/rejected room decisions and one shared charge for multiple sources; actual source capacity/regen observations and no premature stock projection.
- Combined miners/couriers/reserver plus home redistribution, with all births and inventories funded from stated initial resources and observed deliveries.
- Threat, lost vision, retreat and fresh safe return; lease/controller/home changes; queued cleanup and unrelated state preservation.
- Keep controller attack/downer missions in ED-33 and specialist/keeper behavior in ED-35; ordinary reservation is not those paths.

Construction runtime qualification does not close these ED-29 obligations or the broader RC gate.

## Quotation component status

14cf721 implements buffered balanced bodies, service/replacement pricing, one-room cost commitment and independent two-leg controller measurement with bounded persistent progress. Clean focused native quotation/assessment/management/actuator regressions pass; full units1418, zero Lizard violations. See remote-reservation-quotes.md for scope, exact evidence and remaining per-room policy/recruitment/funding gates. Automatic reserve remains disabled; no quoted source-production projection or natural handoff claim follows.

## Per-room seam status

6bcfa0e supplies validated quoted/null candidate decisions, once-per-room pricing, current controller/body/route requotation, and schema3 invalidation of old offers while preserving lease generations. The clean218-case native suite and1427-unit gate pass; see remote-reservation-quotes.md and evidence/room-reservation-native.json. The earlier policy/data seam discussion records the original audit state. Automatic native policy remains reserve:false; generation-owned recruitment, final funding/slot admission, actor service and natural buffered replacement remain required.

The new population family must join both app/remotes/workforce-admission.ts and infrastructure/population/home.ts pending-other accounting. Bind its quote to the current managed lease generation and controller, rather than accepting any same-room cached offer. Reuse shared reservation tasks/controller dispatch and movement. A CLAIM/MOVE actor needs no private cargo/refund state machine. Preserve old/manual Reserve actuator access separately.
