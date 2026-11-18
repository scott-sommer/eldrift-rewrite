# Remote operations: assessment increment

ED-29 remains In Progress. Implemented boundaries include source assessment, selection, exclusive leases, typed demand, explicit reservation task execution, live remote energy extraction, and confirmed home cargo recovery. Automatic remote discovery/selection and mission registration in the main loop, automatic mining/hauling orchestration, adaptive support and infrastructure activation remain open. The reservation scenario explicitly composes the production task/service with shared population and dispatch; this is not automatic whole-feature activation.

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

capabilities/economy owns plain formulas and body lifetime validation; features/remotes owns freshness/ownership/reservation admission; app/remotes/assessment/native composes native room routing, shared snapshots/path search and retained geometry. Request IDs use an exact framed home/source tuple. Reports retain observed source facts and timestamps, independent miner/empty-outbound/loaded-return travel, current reservation metadata and each economic charge. Results are detached; the service does not write state.

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
3. Production reserver orchestration around the implemented controller/task boundary: measured body/travel policy, replacement, expiry and cancellation during spawning or damage.
4. Connect implemented source approach/live station extraction to automatic demand; integrate confirmed home banking into production orchestration and implement dedicated remote hauling and road/container construction through the existing owners.
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

The expanded read-only native probe also passes8ticks on clean8fc6b86 (engine-huWElW); exact source/bundle/engine provenance and rows are archived alongside the pre-commit run. No runtime assignment/remote action integration is claimed by this probe.

## Reservation execution increment

app/remotes/reservation-task adapts typed lease authority into the existing durable task runner. It continuously resolves current demand, treats transient waits as running work rather than exhausting failure retries, and retires toward an owned home refuge when authority expires or changes. A terminal retreat uses the task runner's existing scope cleanup. app/remotes/assign-reservation-task preserves unrelated queued work, renews only the same assignment generation, and lets revoked tasks retire before accepting a new generation. Task lifetime is separate from lease lifetime so authority expiry can trigger actual return travel.

Native service uses current visible observations for home/current/target rooms, known-safe intel traversal and the shared movement service. Its allowed room corridor is explicit; normal work does not exempt origin or destination from policy. Retreat may escape an excluded origin, but never exempts its destination. CPU/read/route admission failure holds service. Threat or ownership rejection directs an active reserver toward its owned home; after fresh safe observations it can resume. Missing home ownership/refuge cannot be certified as successful retirement.

Controller reservation extends the existing native controller action adapter. Durable controller/unit admission is saved before the effect, including rejection/exception cases, and the common creep arbiter enforces action ownership. Same-tick reset/re-entry cannot issue a duplicate or combine reserve/claim for one unit. Controller reservation state is observed on subsequent ticks; OK is not treated as a completion receipt or a predicted expiry. The service avoids scheduling reservation increments beyond the native maximum. API reference: https://docs.screeps.com/api/#Creep.reserveController; pinned engine4.3.2 processor and game-method source were inspected locally.

The new --remote-reservation scenario explicitly wires production assignment, task, observation, movement, controller and population/spawn owners. It pays for real CLAIM/CLAIM/MOVE/MOVE spawning; a fixture supplies the body and12-tick travel allowance rather than claiming an automatic body/route planner. Hostile pressure is inserted at tick30 and removed at45. The fixture shortens the incumbent's actual lifetime and replenishes spawn energy at tick66 to exercise proactive replacement. These are controlled scenario inputs, not observed colony income or a600-tick unmodified lifespan soak.

Executed dirty run engine-ULoiLb passes140ticks: first accepted reservation17, home retreat32, recovery48, replacement spawning67 while incumbent is alive, replacement reservation82, lease expiry110, retired home/task cleared113. Real global resets24/56/91 and same-tick fresh-controller-adapter duplicate checks are included. Exact provenance and rows are archived in remote-reservation-native.json. Native samples include probe instrumentation and stored trace rows; they are not production CPU/Memory acceptance metrics.

Focused adapter/task/route/smoke12tests/4files pass277ms; full units1294tests/354files pass9.16s; type/lint/boundaries pass; Lizard594production/503testfiles zero violations; packaged CommonJS/no-Node-globals check passes. The expanded191-case full engine suite will qualify shared controller-dispatch regression separately; no result is claimed until it completes.

Still required: bounded automatic portfolio/intel collection, adaptive/keeper commitment policy, production reserver demand/body/travel/replacement orchestration (including damaged units and cancellation while spawning), home-loss/vision-loss/travel-interruption scenarios, native remote extraction/transport/construction, dead-unit maintenance integration, public operator/memory translation and the final ED-29 acceptance audit. The fixture uses a persistent MOVE-only vision witness, so it does not prove remote service recovery after losing all vision.

## Clean combined regression qualification

The complete 191-case engine suite passes on clean committed f0ad244 in 704.27 seconds. Every case's source commit, clean status, bundle/engine provenance, expected status and evidence digest were checked before archiving in remote-reservation-engine-suite.json. Injected-error and timeout cases passed their expected-failure assertions. The clean remote-reservation run (engine-MU528L) is also archived in full alongside its initial dirty run. This qualifies the shared controller-dispatch extension and the existing runtime regression baseline; it does not close the remaining ED-29 operational requirements.

## Source handoff findings for remaining implementation

- Active jobs.js runJobReserveController, invoked by role.claimer.js runReserver, attacks the controller whenever reserveController returns non-OK. Explicit downer attack/reserve behavior also exists. Controller intervention remains required under ED-33, recorded there; the new plain reservation service does not silently treat attack behavior as implemented. Its suspension/retreat boundary deliberately separates reservation intent from intervention policy.
- The Reserve/Outpost flag-spawning blocks around spawner.js2205/2240 are commented, while ordered manager reservation target recruitment is active around2269 onward. Active recruitment waits until no assigned reserver exists and remaining reservation is below1500. Production orchestration must retain configurable timing/priority while using honest CLAIM lifetime, actual body buildability, measured travel and proactive replacement. The new fixture only proves the shared population mechanism with an explicit body/travel input.
- role.minerV2.js has active arrival reporting and end-of-life failure reporting, source/container positioning, low-container-health repair, adjacent-site work during source depletion, nearby energy recovery and keeper flee behavior. remote.manager.js records source success/failure and blacklists both source and room after two consecutive unsuccessful miner lives. Do not count each blocked tick as a failed life or infer a combat cause merely from missing vision. Keeper tactics remain ED-35/ED-33 work, not implied by an atomic portfolio commitment.
- Shared station store deliberately downgrades risk without current vision; current mining task requires a live safe station/tile before running. Add an authority/travel phase using retained source geometry and admitted traversal, then acquire the actual tile and reuse extraction after arrival. Do not fabricate a safe unseen station or weaken shared station admission. Source demand ownership is currently room/source based; the remote home lease must fence old-home actors and requests on handoff.
- The existing route courier wrapper requires an owned destination and is therefore unsuitable unchanged for neutral remotes. Reuse hauling tasks, transfer confirmation, quantity reservations and cargo recovery behind explicit endpoint/lease admission. Loaded return on retirement/threat must remain distinct from retiring an empty unit. Existing construction reconciliation owns accepted site intent and shared limits; remote road/container desired state must enter that boundary rather than invoke an independent planner/actuator.

## Remote energy extraction qualification

Remote application code now lives in app/remotes, with assessment isolated below app/remotes/assessment and matching application tests grouped by responsibility. Reservation and mining share the lease-aware task/assignment mechanism and native movement/retirement boundary. The new extraction component passes its actual 130-tick source/container/vision/threat/expiry scenario. See [remote-mining.md](remote-mining.md) for the implementation boundaries, exact checks, initial fixture failure and remaining integration scope. This is component qualification; ED-29 remains In Progress.

## Confirmed home recovery

The composed mining actor now hands returned cargo to shared hauling/confirmation under an explicit home/population-owner binding. Normal delivery, lost sinks, missed event evidence and full-store recovery pass clean native scenarios. Resource/sink filters and terminal headroom remain injectable policies. See [remote-banking.md](remote-banking.md) for exact proof and limits; dedicated transport and automatic feature orchestration are still open.
