# Remote operations: assessment increment

ED-29 remains In Progress. The current increment implements read-only source admission, body/terrain-aware travel and explicit expected economics. It does not register automatic remote demand, reserve controllers, claim outpost ownership, build infrastructure or run remote mining/hauling. Those are the next implementation stages, not completed acceptance criteria.

## Source extraction

Read-only reference: remote.manager.js at f2bbf7e8c44addc7c426abb5458e393c9502ff5f.

| Source responsibility | Current boundary or retained follow-up |
| --- | --- |
| getPathDistance200–221 | Native remote travel uses the shared path adapter and real admitted room corridor. Partial/incomplete searches produce no economic score. The source returned path length without checking incomplete; this is a deliberate correction. |
| scoreRemoteSourceCandidate498–506 | Portable economy code exposes delivered output, body replacement, hauling, reservation/infrastructure/risk charges and spawn occupancy. The old output/distance ratio is a characterization reference, not renamed as net yield. |
| buildRemoteSourceCandidates508–546 | Feature admission requires known-safe fresh intel, explicit home/source identity, no conflicting assigned home, no owned remote room or foreign reservation. Raw legacy roots are not imported. Portfolio exclusions and keeper commitments remain selection work. |
| get/evaluateSupportedRemoteMiners454–496 | Source uses RCL/default support and1500tick spawn-load evaluation, increasing at<=0.75 and decreasing at>=0.90. The new model exposes per-source spawn cost; adaptive portfolio support policy is still to implement. |
| buildNormalRoomCandidates/selectRemoteSources610–733 | Complete-room preference,15%normal completion bonus, fragment fallback and keeper grouped commitments are still to implement as configurable selection policies. Shared reservation overhead must be repriced for the selected bundle. |
| syncRemoteReservations735 onward | Typed reservation demand/expiry, exclusive home ownership and cleanup are still to implement; no raw Memory.manager mutation occurs in assessment. |

## Model and units

capabilities/economy owns plain formulas and body lifetime validation; features/remotes owns freshness/ownership/reservation admission; app/native-remote-assessment composes native room routing, shared snapshots/path search and retained geometry. Request IDs use an exact framed home/source tuple. Reports retain observed source facts and timestamps, independent miner/empty-outbound/loaded-return travel, current reservation metadata and each economic charge. Results are detached; the service does not write state.

| Quantity | Definition |
| --- | --- |
| Source rate | Observed capacity / injected regeneration ticks |
| Harvest rate | min(source rate, WORK count * injected harvest power) |
| Trip ticks | Empty outbound + loaded return + explicit pickup/delivery service ticks |
| Required haulers | ceil(harvest rate * trip ticks / unboosted carrying capacity) |
| Budgeted haulers | min(required haulers, configured maximum) |
| Delivered rate | min(harvest rate, budgeted haulers * capacity / trip ticks) |
| Replacement interval | Post-spawn lifetime minus initial travel and configured handoff margin |
| Body energy expense | Body cost / replacement interval, multiplied by the budgeted body count |
| Spawn load | Body spawn ticks / replacement interval, plus allocated reservation load |
| Shared reservation charge | Room expense/load divided by the explicitly planned committed source count |
| Net yield | Delivered rate minus mining, hauling, reservation, infrastructure and risk energy rates |

Spawn load is in units of one fully occupied spawn; a home-level aggregate budget may differ with actual spawn capacity. Body prices/spawn duration and unboosted CARRY capacity reuse the pinned spawning/mobility assumptions. Spawn time is charged as occupancy and replacement lead time, not subtracted twice from post-spawn lifetime. Zero carrying/harvesting ability, exhausted service lifetime or immobile initial travel is infeasible. A hauler must complete its first outbound, service and loaded return trip strictly before lifetime minus the handoff margin; an immobile loaded return is infeasible. Transport caps reduce delivered output rather than silently assuming all harvested energy reaches home. Non-finite inputs/arithmetic cannot certify a candidate.

These are steady-state expected costs with planned replacement and buffering, not observed throughput, traffic/combat survival or construction payback. Initial construction/setup and non-energy/boost expenses require explicit policy treatment. Risk is a configured energy-rate allowance, not an inferred death probability. Selecting only part of a proposed room bundle must recompute reservation.shares; observing two sources is not permission to charge a lone selected source only half the room overhead.

The [Source API](https://docs.screeps.com/api/#Source) distinguishes observed energy capacity and regeneration. Assessment uses that observed capacity, not an assumed free increase from a planned reservation. Own reservation duration is aged from its observation; expiry requires refresh before using old reserved production. A future reservation plan/forecast must remain distinguishable from observed facts.

## Admission and native geometry

Production assessment requires known-safe traversal; exploration uncertainty cannot become profitable reachability. Unknown/stale data, CPU/read admission, incomplete paths and expired own reservation remain deferred. A friendly controller/reservation can be traversable without granting mining ownership. Explicit other-home assignment rejects before native queries. Current map status, exclusions, threats and keeper policy share ED-28's request-owned traversal snapshot. Returned routes retain real cardinal crossings and are rechecked against that policy.

Native assessment additionally requires the currently owned home and buildable miner/hauler bodies against home.energyCapacityAvailable, not momentary energyAvailable. Reservation expense is supplied separately here; reserver buildability/lifecycle remains upcoming work. Storage is the normal native anchor, with an owned spawn fallback; an injected origin can supply a committed-layout strategy without coupling economics to layout storage.

Empty and loaded bodies use the existing mobility fatigue model. Each leg must finish at its goal range before its cost is accepted. The return starts from the actual outward arrival tile. Visible rooms use shared live static matrices; hidden admitted rooms retain known sources, minerals, controller, roads and structure blockers. Unknown public status on a foreign rampart is conservatively blocked. Missing prepared geometry fails closed. These are static best-known estimates in one high-level corridor, not a proof of globally minimal travel or unseen-world immutability. Mission movement must revalidate live legality and react to threats.

The service accepts a caller-owned CPU guard and explicit room/search limits. It is not registered into the main loop yet. Bounded automatic scanning, useful progress under small budgets, portfolio cursors and mission state are still required before runtime activation. Known-safe freshness refers to supplied observations; the caller owns intel refresh and operational threat checks.

## Executed evidence

Focused model/ownership/smoke checks pass19tests/5files279ms before the final metadata addition. After the first-delivery lifetime correction, full units1257tests/349files pass10.51s; quality580production/496testfiles has zero Lizard violations; CommonJS/no-Node-globals bundle check passes. The gameplay bundle SHA-256 remains62ec706563a353d193d17dc172bf1b4e8687325ed1f8555a449385f6079da9b5, byte-identical to the clean189-case ED-28 runtime; new assessment code is exercised through its explicit probe entrypoint.

--remote-assessment passes8real-engine ticks with affordable bodies, near/far sources, distinct loaded/empty travel, profitable and risk-rejected estimates, native one-operation partial-search refusal, paused admission, foreign unit/reservation pressure, recovery, own reservation metadata, actual later vision loss, retained obstacles and a strict stale-data request. Every assessment batch leaves the observed-state root and unrelated sentinel unchanged. Native expense rates for reservation/infrastructure are explicit fixture assumptions, not measured reservation work. No mining/hauling/reservation effects or long-run throughput are claimed.

docs/evidence/remote-assessment-native.json retains the exact dirty source/bundle/engine provenance, all rows and the initial fixture bootstrap failure. Batch CPU counters include multiple queries and cold preparation; they are not a production mean/tail acceptance benchmark. The new case is registered in the190-case suite; that full combined run is not claimed here. Targeted native checks plus the full unit milestone keep this read-only increment's loop fast; combined runtime qualification follows operational integration.

## Remaining ED-29 work

1. Connect the implemented typed Mine/Reserve/Outpost demand and exclusive room leases to current admission, portfolio reconciliation, population and mission execution; add source/room operator exclusions.
2. Connect implemented bundle/fragment selection and shared-cost repricing to bounded collection; implement adaptive supported budget and specialist keeper readiness/risk inputs.
3. Reserver controller actions/state machine, correct body lifetime/travel replacement, expiry and cancellation without stranded requests.
4. Shared station extraction, remote hauling/return cargo and explicit road/container construction through the existing owners.
5. Hostile/vision/path interruption suspension, retreat and recovery, followed by profitable/rejected, differing-distance, reserver-replacement and return-to-service native scenarios.
6. Full combined qualification and acceptance audit. ED-39/44 still own public legacy flag/console and memory translation; ED-35 owns specialist keeper/power execution; ED-43 owns measured multi-room pressure/CPU/Memory/soak.

The first-delivery correction also passes the8-tick native scenario (engine-MKpGF8, dirty6e28b2a). The initial committed assessment passed engine-v6QO8M on clean6e28b2a; exact evidence is retained in remote-assessment-clean-native.json. These scopes remain read-only assessment qualification.

Clean committed correction1ff5297 also passes engine-Ok5XeE (8ticks); full provenance/rows are archived with the preceding runs.

## Portfolio selection increment

features/remotes/portfolio is a pure, bounded selection boundary. It takes explicit source inventories (not merely the assessments that happened to finish), detached assessed facts and economic policy, then recomputes each proposed room bundle. Quotes carry the observed capacity and independent travel measurements; the old economic score is never trusted after bundle membership changes. Every selected room pays exactly its full reservation energy/spawn charge, divided among its actual selected sources. Conflicting per-room reservation prices are refused.

Default nearest ordering retains the legacy complete-room-first phase and fragment fallback; net-yield ordering is interchangeable for both phases. Complete-room rank exposes the configured completion bonus (legacy reference0.15). Within the complete-room phase the same bonus scales all complete bundles, so it does not change their relative net-yield order. This is deliberately a bounded greedy policy, not a globally optimal solver. Inputs are capped at64rooms/128quotes/16inventory sources per room. Missing quotes leave a room incomplete. Atomic commitments prohibit fragments and charge explicit extra support slots, energy and spawn load; these are inputs for later keeper readiness/patrol integration, not implemented keeper execution.

Hard home budgets apply across all rooms: source/support slots, haulers and spawn occupancy. Minimum home net yield applies after accumulation, so several individually smaller profitable rooms may meet it together. Source profitability/feasibility gates still apply independently, and negative-net room commitments are refused. Non-finite totals/ranking cannot certify selection. Freshness and reservation expiry are aged at the selection tick. The caller must still obtain current admission and exclusive assignment authority before executing a result; selection does not claim ownership or bypass a newly observed threat.

Verification: focused portfolio/assessment/smoke22tests/3files pass399ms; full units1271tests/350files pass10.61s; type/lint/boundaries pass; Lizard584production/498testfiles zero violations; packaged CommonJS/no-Node-globals check passes. Gameplay bundle remains byte-identical SHA-25662ec706563a353d193d17dc172bf1b4e8687325ed1f8555a449385f6079da9b5. No new native execution claim accompanies this pure policy increment; operational portfolio activation and full combined native qualification remain required.

## Exclusive assignments and typed demand

remotes/assignments is a feature-owned versioned empire index, capped at128room leases; a reconciliation batch contains at most64room plans. A home atomically replaces its desired set, rejects any conflict with another unexpired home, prunes expired leases, and preserves every other active home's plans and unrelated memory. Empty reads, rejected batches and stale revisions do not initialize or mutate storage. Expected revision plus a monotonic clock prevents stale decisions from overwriting newer work. Actual gameplay admission and ownership of the home are still the composition caller's responsibility; the lease is coordination authority, not evidence of current room safety.

Each normalized room plan explicitly lists source IDs, an optional controller ID/position, and optional road/container intent. The lease has a stable exact home/room identity and an expiry. Unchanged renewals retain generation; plan changes, expiry/reacquisition and handoffs create a new generation. Source ordering is normalized. Store.resolve reloads current Mine/Reserve/Outpost demand by its ID and generation, rejects expired tokens even after renewal, and returns current detached payload. Executors must resolve authority before effects and separately revalidate current intel and live targets. Dropping a plan removes its authority immediately; physical creep retirement, queued population cancellation and shared reservation cleanup remain mission-integration work.

Typed demand IDs retain home, room, kind and source/controller identity. Every descriptor carries the assignment generation and expiry. These descriptors are not spawn or action effects. Reserve and infrastructure payloads can exist independently of mining. No legacy Memory.manager roots are imported; ED-39/44 still own public legacy flags/console and migration. Current assignment state is new version1, with owner remotes; malformed/future state is refused by the standard envelope path.

Assessment now retains its exact detached economic policy alongside body-specific travel. Portfolio repricing takes that retained policy, not a second potentially mismatched body policy supplied by the selector caller. The expanded8-tick native assessment probe verifies full and single-source portfolios, exact room reservation allocation, nearest source selection and zero-capacity refusal against actual engine travel. Its CPU/Memory samples include extra read-only queries and serialized probe rows; they are not operational performance qualification.

Final increment checks:34focused authority/portfolio/assessment/smoke tests pass338ms; full units1283tests/351files pass10.40s; type/lint/boundaries pass; Lizard589production/499testfiles zero violations; packaged check passes. Dirty native run engine-uvpLIT passes8ticks, with full provenance archived in remote-portfolio-native.json. Assignment conflict, expiry, reset, capacity and generation behavior is unit-tested; actual remote mission execution remains unimplemented here. Gameplay main bundle is unchanged; full190-case combined qualification is still pending operational integration.
