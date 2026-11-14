# Spawning port record

ED-19 in progress. Pure body sizing lives in capabilities/spawning; it neither reads room state nor creates role memory.

Source: read-only Eldrift-Directive spawner.js at baseline f2bbf7e8c44addc7c426abb5458e393c9502ff5f, buildRoadScavengerBody (around line 426) and getBody miner/courier branches (around lines 648-760). This is source-derived selective porting; direct executable differential characterization remains to be added.

Preserved:
- Scavenger repeats CARRY/CARRY/MOVE, adds CARRY/MOVE when the remainder permits, caps budget at 1600.
- Courier uses grouped CARRY then MOVE below 1100; at 1100 and above includes WORK between grouped CARRY and MOVE, with the legacy 2600 budget cap and at most 50 parts.
- Ordinary source-miner bodies retain 300/550/800/900 energy tiers and ordering.
- Body plans expose exact cost and three ticks per part. Memory creation and room policy are separate.

Deliberate correction: legacy ordinary miner returns a 300-energy body even below that budget. The new sizing returns an affordable WORK/CARRY/MOVE body at 200, and no plan below 200. Room recovery policy will explicitly choose current available energy instead of hiding that decision inside sizing.

Not yet ported: mineral/keeper/boost/specialist recipes, request ownership and persistence, cancellation/expiry, allocation across spawns, role memory, demand, replacement policy, and native spawn execution. No claim of complete spawning parity.

Validation: 223 tests passed in 2.58s; quality gates passed with 83 production files and zero Lizard violations. Recipe tests cover threshold boundaries, ordering, detached outputs, every 25-energy budget from 0 through 10000, and part limits. No engine spawn scenario executed yet.

## Allocation foundation
SpawnRequest separates stable ID/name/owner, room, priority, readyAt/expiresAt and body from role-memory construction. Pure allocation filters expiry/not-ready/live names, chooses idle spawns deterministically and subtracts each assignment from a shared per-room budget. Lower numbers win, matching legacy descending sort followed by pop (spawner.js around 2608). Equal priorities use stable request ID. Caller explicitly chooses wait (reserve room priority for unaffordable head) or skip (allow affordable lower-priority work); neither blocks another room.
Replacement timing includes body length times three, travel estimate and configurable margin. Allocation is a proposal, never a receipt: it cannot delete persistent requests, prove a native spawn succeeded, or prevent duplicate execution across repeated calls on its own. Those are the next queue/executor responsibilities.
Validation: 227 tests passed in 2.74s; quality gates passed, zero Lizard violations. Tests cover multi-spawn shared energy, multi-room independence, priority, head policy, expiry, not-ready requests, busy spawns, existing names, duplicate identities and replacement boundary. No new engine scenario yet.

## Execution boundary
One executor batch is admitted per tick and sealed before callbacks. Results distinguish accepted, rejected and uncertain (thrown) attempts; failures do not suppress independent assignments. Duplicate spawn/request/name allocations fail before effects. The native adapter injects role-memory creation and verifies spawn ownership/room before spawnCreep.
Validation: 229 unit tests passed in 2.62s; quality gates passed with zero Lizard violations. A new 12-tick pinned-engine spawn scenario proves one accepted request, an observed spawning interval and eventual birth using the 200-energy miner body. The initial stub terrain prevented birth; the scenario now explicitly provides plain birth tiles. Full engine suite was not rerun in this milestone; the new spawn case is registered for future full runs.
Persistent queue acknowledgement and reset reconciliation remain unfinished. Accepted is an API receipt, not proof of eventual birth; the engine scenario separately observes birth.

## Durable queue lifecycle
Population owns versioned per-room spawning records (maximum 200 requests). Submission rejects conflicting identities/names; cancellation verifies request owner. Reconciliation removes expired requests and requests whose names are observed, including spawning creeps. Before native effects, the coordinator must persist defer(ids, tick), advancing eligibility to the next tick. This supports same-tick reconstruction safety and next-tick observation reconciliation; accepted API receipts alone do not retire requests.
Validation: 230 tests passed in 2.61s; quality/Lizard passed with zero violations. Serialized-port tests cover duplicate submission, owner mismatch, reconstruction, deferred retry, observation, cancellation, expiry and room isolation. Queue/executor coordinator and actual-engine queue reset scenario remain outstanding. Existing engine tests were not rerun for this isolated queue addition.

## Queue-to-execution coordinator
The empire-wide coordinator persists a dispatch tick before observation/allocation/effects, reconciles room queues, allocates a shared batch, persists deferrals, then invokes the executor. A durable global admission marker also prevents a same-tick reconstructed coordinator from assigning a different pending request to the already-used spawn. Failed admission writes prevent native effects. A failed later operation conservatively waits until next tick.
Validation: 232 tests passed in 2.97s; quality/Lizard passed with zero violations. The 12-tick actual-engine spawn fixture now uses real Memory queues and reconstructs the coordinator twice each tick, asserting no second dispatch, queue retirement upon observing the spawning creep, one accepted request and eventual birth. This is service reconstruction, not a full isolated-vm code reload. Specialist recipes, legacy differential characterization, demand and broader multi-spawn engine cases remain.

## Population demand reconciliation
Pure reconciliation now computes effective live population, missing requests and excess/expired request cancellations for a specific owner+room demand scope. Spawning creeps count as effective; a creep entering its replacement window does not. The window uses the replacement body's spawn duration, estimated travel and margin. Future-ready pending requests still reserve population, while observed request names are not double-counted. Falling targets retain highest-priority/stable-ID requests and cancel excess only in the matching scope.
Owner here identifies a concrete demand such as mining:source-id; a whole role should not share an owner when its independent assignments have different targets. Feature policies still must generate identities/memory, apply cancellations and enqueue missing demand.
Validation: 235 tests passed in 2.74s; quality/Lizard zero violations. Tests cover exact replacement boundary, spawning handover, duplicate-demand avoidance, falling targets, scope/room independence, expired requests and future-ready reservations. No additional engine run for this pure calculation milestone.

## Executable legacy comparison
The characterization extractor now includes getBody directly from git show at the pinned legacy baseline, recording file/line/hash alongside the source excerpt. Differential tests execute that unmodified function in an isolated context and compare ordered parts against the new scavenger/courier/ordinary-miner recipes at every 25-energy step from 300 through 10000 (389 budgets per recipe). Existing miner/courier roster entries deliberately isolate sizing from legacy bootstrap budget overrides. A separate 200-energy test demonstrates and documents the intentional miner affordability correction.
Validation: 237 tests passed in 2.74s; quality/Lizard passed with zero violations. No legacy checkout changes. This evidence covers these three body-sizing paths, not specialist bodies, boosts, storage-driven budget policy or full population parity.

## Explicit economy budget policy
Feature-owned economyBudget separates immediate recovery energy from mature capacity sizing. Existing miners/couriers size to capacity; absent roles use available energy unless storage exceeds the configured reserve and a filler exists. A replenishable missing courier targets at least the configurable mature budget (default 1100), bounded by capacity. Recovery scavenger sizing uses available energy. Defaults retain the legacy 5000 reserve and 1100 courier threshold; maximum budget is independently configurable.
Deliberate correction: storage alone no longer makes an absent miner wait for capacity when there is no filler. The legacy branch checks storage but not replenishment capability; observations now supply stored energy explicitly rather than relying on the legacy room.storage[RESOURCE_ENERGY] access. Specialist and mission policies remain separate.
Validation: 240 tests passed in 2.68s; quality/Lizard zero violations. Tests cover bootstrap, established roles, missing fillers, exact reserve boundary, configurable limits and invalid capacity. Policy is not yet registered with gameplay producers.

## Applying demand to durable queues
applyPopulationDemand now connects scoped reconciliation to owner-checked cancellation and queue submission. Durable per-room identity sequences reserve each request/name before enqueue; interrupted writes may leave gaps but do not reuse reserved names. Repeated planning counts pending requests instead of issuing new identities, and replacement timing must match the supplied body length. Feature-owned native memory remains an injected concern.
Validation: 241 tests passed in 2.77s; quality/Lizard zero violations. The integration test covers repeated same/next-tick planning, observed-creep handover, replacement names, falling demand and independent room identity. The module still requires gameplay-owned observations and plan producers; it is not registered in main yet.

## Multi-spawn engine contention
New RCL8 two-room fixture uses two spawns sharing 300 available energy in one room and a third spawn with 300 energy in another. Two 200-energy requests contend locally; only the highest-priority request is accepted, the second remains queued, and the other room accepts its independent request. A higher-priority cancelled request never appears. Observed spawning names retire accepted queues by the next tick.
Validation: targeted scenario passed, quality/Lizard zero violations; full engine suite 21 checks passed in 20.24s. This covers mature-room spawn topology with deliberately scarce energy, not mature economy throughput. Production source unchanged in this milestone.

## Validation and population identity handoff
Demand application now validates the prospective request and aggregate queue capacity before cancellations or identity reservation, preventing invalid/oversized plans from partially modifying valid queues. Tests compare the complete stored records before/after rejection.
The native population adapter supplies owner/home memory separately from bodies and observes population by home demand scope, not current travel room. It also supplies owned-room energy, spawn slots and all observed creep names to the coordinator. The birth fixture now uses these production adapters and asserts owner/home survives spawning.
Validation: 242 tests passed in 2.81s before the adapter change; subsequent quality gates passed with 95 production files and zero Lizard violations, and the targeted 12-tick native spawn/identity scenario passed. Full engine suite not rerun for this change.
