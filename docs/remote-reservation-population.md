# Automatic reservation population

Implementation a376519 connects priced room decisions to generation-owned recruitment and ordinary main-loop controller service. The legacy operator/manual actuator remains separate. Ordinary reservation is not a controller-attack, keeper or power-bank mission.

## Enablement and ownership

Reservation work requires remoteManagementEnabled, remoteWorkersEnabled and remoteReservationEnabled, plus nonzero remoteMaximumSlots and remoteWorkerMaximumUnits. New births additionally require remoteSpawningEnabled. Shared configuration layers provide body budget, minimum buffer, replacement margin and bounded quote visits as described in remote-reservation-selection.md. The default remains disabled.

A plan requires a current managed lease generation, matching controller and a validated fresh priced offer. Final dispatch re-quotes current controller geometry, topology, body, pricing policy and economics under a bounded CPU guard. Current ownership, threat, traversal and home/body-capacity checks cannot be bypassed by a cached room price. A changed policy or invalid generation cannot create another actor from an old queue entry.

Population, funding, final admission and actors are separate modules under app/remotes/reservation/population. The shared reserve task behavior, controller dispatcher, movement and retirement services execute actions. Main-loop maintenance uses an explicitly composed task-definition catalog so one role can preserve another role's queued work. No private controller actuator, cargo state machine or parallel population queue is added.

## Funding and limits

remoteReservationEnergyReserve now controls birth funding (default 50000; range 0–1000000). New/replacement body costs must fit storage energy above this floor after other queued birth costs are deducted. Multiple selected reservers share the finite remaining bank. Existing healthy service does not consume a second birth budget. This is birth admission, not a durable escrow for all future construction or a claim of economic payback.

Dispatch also requires actual available spawn energy and a genuinely due birth. A healthy or already spawning replacement prevents stale queued duplication. All reservation, source and construction actors share the physical and same-tick home workforce ceiling; old/retiring/spawning units still count. Pending reserver births reduce construction workforce availability before native rosters update.

Home storage does not refill spawns by itself. Configure actual home redistribution and protect extraction startup funding. The native qualification recruits a real distributor rather than injecting replenishment; its transfers are local redistribution, not remote income.

## Lifecycle and recovery

Recurring birth timing uses the shared service/retirement/replacement model, with CLAIM lifetime and separately measured controller approach/return. Actors retire at the priced threshold. Recruitment handles unhealthy bodies and due replacements independently of active controller service. Revoked, disabled, underfunded or unselected queued work is cancelled only within the reservation family and home; in-flight spawning is cancelled through shared structure dispatch when its authority disappears.

Threat/route/authority failures stop controller actions and send workers home. A healthy idle worker already returned to the same home can accept a newer currently admitted generation for the same target room. Adoption requires sufficient remaining service life, the exact undamaged body and an empty task queue. Away/spawning/damaged/retiring/future-generation actors and foreign tasks are left alone. Fresh assignment and live quote checks precede adoption; the old task authority is never reused.

Two integration corrections preserve this separation. Changed observed source geometry/capacity triggers repricing before replacing an existing managed lease; the pending scan does not renew it, and independent actor admission remains responsible for current safety. Live admitted reservation duration is refreshed for portfolio selection without making source observations younger. An old short reservation snapshot must not revoke its own continuously growing reservation.

## Controller cache upgrade

remoteReserveTravel/<home> advances from schema 1 to schema 2. The bounded record now retains two measured legs independently for at most 64 controller rooms, so live checks for one room cannot evict another selected room's progress. The oldest measured room is evicted safely when capacity is reached. Controller/topology changes invalidate only that room's measurement.

Valid old schema-1 measurements are invalidated for remeasurement while revision and clock fencing survive. Corrupt old state is rejected. Management remains schema 3 and reservation selection remains schema 1; source-travel progress is untouched. A native reload/legacy-cache injection scenario proves the upgrade through normal quotation.

## Qualification

Full units: 1459 tests /396 files /10.37 seconds. Type checking, lint, boundaries and packaged bundle pass. Pinned Lizard: 713 production files /578 test files, zero violations. Clean full native gate: 222 scenarios in 1358.47 seconds. Exact case provenance/digests are in evidence/reservation-population-engine-suite.json; lifecycle rows and limitations are in evidence/reservation-population-native.json.

The positive 900-tick fixture starts with no reserver or distributor. It supplies a known candidate, passive witness and direct management orchestration; ordinary main-loop recruitment, final admission and actor/distributor service run unmodified. Initial RCL6 capital is 2300 spawn/extension energy plus 8000 storage. Both 1300-energy reservers and the 150-energy distributor are funded from that stock. Extensions are spaced so consumers remain reachable. No mid-run resources or lifetimes are injected.

The quoted controller timing is 7 outbound, 31 retirement reserve, 25 scheduling margin, 562 service and 536 replacement ticks. Actual births start at ticks 10 and 546, matching the recurring quote. The successor is ready at 558, before original retirement at 590. The original returns home with no task, reaches TTL 1 at 620 and expires naturally. A 30-tick hostile interval causes retreat; the reservation buffer remains positive and service recovers under fresh generation authority. Final withdrawal at 850 leaves the surviving reserver home with no task by 900.

Source capacity changes to 3000 at tick 27 while energy remains 1500; regeneration refills it at 327. No source is extracted in this fixture and none of its stock is counted as home income. Physical home stock, carried energy and observed birth expenditure reconcile to 10300 on every row. Accepted spawn identities become visible before their energy debit, so birth expenditure is aligned to the next native observation boundary. An earlier smaller-capital diagnostic legitimately gained passive native spawn energy; the qualified setup avoids that supply rather than labelling it remote income.

A separate 120-tick scenario refuses underfunded, disabled and infeasible reservation stages and removes a deliberately stale scoped request. A 48-tick scenario revokes authority during spawning: the birth is cancelled before service, unrelated work survives, and spent birth energy is not called a refund. Exact refusal, cancellation and cache-upgrade traces are archived alongside the positive run.

## Remaining ED-29 scope

This component does not qualify the combined automatic scouting/discovery/miner/courier/reserver income pipeline, startup capital/warmup/payback, lost vision, longer-route contended handoffs, damaged-return policy, home loss/alternate-home ownership or aggregate pressure/soak. The legacy 1500-tick adaptive capacity policy and full-life per-home reachability feedback remain separate obligations. Specialist, operator and project-wide migration/rollback work remains tracked by ED-35, ED-39 and ED-44. ED-29 and the release-candidate goal stay open.
