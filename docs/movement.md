# Movement implementation and adoption record

ED-18 is in progress. Path search now has explicit complete/incomplete/no-route outcomes, plain position records and a native Screeps adapter. The adapter puts range on the goal (not search options), applies an explicit room allow-list before searching and in the room callback, and checks the final room-aware endpoint before reporting completion. An empty/partial budget-limited engine result remains incomplete; it is not proof that no route exists. No-route currently means a policy exclusion.

Path cache keys include both room/coordinate endpoints, range, profile ID and concrete costs/budgets, topology version, policy version and canonical allowed-room set. Only complete results are cached. The heap cache has bounded capacity and TTL, explicit invalidation and detached returned paths. Reset reconstructs it empty. Callers must advance topology/policy versions when their matrix or safety assumptions change; automatic matrix revision tracking and stuck recovery remain unfinished. No raw creep.moveTo calls or RoomPosition prototype overrides are introduced.

Legacy inspection: utilV2.js addOutpostShort takes the last PathFinder result without checking incomplete and puts range in search options. The new search boundary corrects these mechanics. waypointer.js owns waypoint selection and portal-stage bookkeeping and calls moveTo directly; preserve that operator behavior later behind the unified movement authority rather than copying the direct movement calls.

Primary references:
- Screeps PathFinder API: https://docs.screeps.com/api/#PathFinder.search documents partial paths, search limits and false room-callback exclusion.
- Cartographer: https://github.com/screepers/screeps-cartographer describes caching, stuck recovery, traffic priority, intrashard portal routing and its requirement not to mix native prototype movement with its traffic reconciler.
- Candidate metadata: https://raw.githubusercontent.com/screepers/screeps-cartographer/main/package.json currently declares version 1.8.16 and MIT. A root license file was not retrieved in this inspection; package metadata alone is not a completed source/license audit.

Current decision: keep a narrow native PathFinder adapter as the measured baseline and preserve proven legacy policy selectively. Do not adopt Cartographer yet. Before adoption, pin an exact artifact/revision, inspect its distributed license/dependencies, compare CPU and behavior on the same engine fixtures, and ensure it becomes the single movement authority including formations. No candidate performance claim or final adopt/reject decision is made here.

Evidence: 179 tests passed in 2.60s; quality/Lizard passed with 62 production files and zero violations. Twelve actual-engine scenarios passed in 10.60s. The new paths scenario searches a plain-room route, moves a creep to its observed endpoint, checks repeated cache reuse, then bumps topology version and verifies one additional search (counts 1,1,2). It also checks endpoint policy exclusion. After simplifying its search counter, the specific scenario passed again with engine CPU samples 6/1/1ms (tiny fixture/startup-inclusive, not representative travel cost).

Still required: coordinate boundary and exit behavior, route policy, structural/dynamic cost matrices and visibility, damaged-body movement profiles, stuck/repath recovery, coordinated traffic/formation extension and wider engine coverage. The production composition does not yet dispatch movement requests; this milestone supplies the search/cache boundary consumed by the engine fixture.

## World-room geometry and route policy

World-room coordinate helpers use E0/S0 = 0 and W0/N0 = -1, matching the installed pinned engine's src/utils.js roomNameToXY/getRoomNameFromXY convention. Cardinal neighbors cross the zero axes without aliasing rooms. Canonical world names are validated; simulation names require a separate adapter rather than being silently interpreted as world rooms. These helpers describe room adjacency, not traversable exits or local position equality. The engine's creep tick processor also shows that entering an edge queues an inter-room relocation; tile-distance arithmetic is not substituted for that movement behavior.

Room routing now separates policy from the native Game.map.findRoute adapter. Explicit blocked rooms produce infinite callback cost; destination exclusion, no route and maximum-room budget are distinct unavailable outcomes. Successful routes carry their policy version and ordered room set for path-search allow-lists. A finder returning an excluded room or wrong endpoint is rejected. Current callers must compose the room route with the path request; dispatch integration and dynamic policy revision sources remain outstanding.

Validation: 191 tests passed in 2.46s, quality/Lizard passed with 65 production files and zero violations. New tests cover W0/E0 and N0/S0 inverses, multi-digit names, invalid/unsafe names, hostile-room exclusions, room weights, no-route and search-room limits. This milestone has not added engine cross-room/exit coverage; ED-18 remains open for that evidence and traffic/matrix/recovery integration.

## Observed movement costs

The matrix adapter now observes roads, obstacle structures, sources/minerals/deposits/controller, owned blocking construction sites, and optional creep/power-creep occupancy. Non-owned private ramparts block; owned/public ramparts remain passable. Rules were checked against the pinned engine movement processor and OBSTACLE_OBJECT_TYPES. Fixed obstacles override road cost on shared tiles. Unit occupancy is an optional overlay with an explicit moving-unit ID exclusion; this is conservative occupancy avoidance, not traffic arbitration or safe-mode shoving semantics.

Pure cost-cell construction produces canonical order and a content-based revision. Room snapshots return visibility and matrix/version together. Unseen rooms return an explicit unseen revision and undefined matrix, allowing native terrain search; the adapter does not delete retained intel or pretend current structures are known. A future retained-intel policy can supply additional conservative costs. Cached paths must include the relevant snapshot revisions; full multi-room revision aggregation remains integration work. Observation currently rescans the room per requested matrix, so per-tick snapshot sharing remains an optimization to implement alongside dispatch.

Validation: 193 tests passed in 3.06s, quality/Lizard passed with 67 production files and zero violations. The native path engine fixture now uses these observed matrices and asserts spawn blocking, occupancy overlay, mover exclusion and unseen-room reporting while still proving arrival/cache behavior. Three actual engine ticks passed, with CPU samples 6/1/1ms for the small fixture. Rampart/site permutations and dynamic-blocker recovery need broader adapter/engine cases before ED-18 acceptance.

## Navigation progress and repathing

A bounded heap progress tracker now compares the current room-aware position only against a move accepted on the immediately preceding tick. Repeated same-tick observation does not double-count; waits, fatigue/immobility, progress, skipped ticks and reset clear the failure streak. Track by object identity, not reusable creep name. It records neither queued nor rejected movement as an issued attempt.

The navigator composes movementStep, path search and progress tracking. At the configurable threshold (default two failures), it requests occupancy-aware matrices and invalidates that request before a fresh search. The request port must include the resulting matrix revisions in the path key. An explicit unit argument goes to the movement port so composition can use the shared action arbiter. Observed arrival completes even if MOVE parts are now destroyed; an unarrived immobile unit fails explicitly. Native moveTo is not used.

Validation: full suite 195 tests passed in 2.46s before the final arrival/port refinement; the relevant progress+smoke tests then passed in224ms, and quality/Lizard passed with69 production files and zero violations. Tests demonstrate two unchanged accepted moves switching to avoidance, cache bypass on recovery, successful progress clearing the streak, room identity changes, skipped ticks/reset and damaged-unit arrival. Actual-engine repeated-blocker recovery remains the next required scenario; these contracts alone do not close it or establish traffic arbitration. Production dispatch still awaits the shared movement composition.

## Actual-engine repeated-blocker recovery

The --recovery scenario now composes the real native path search, observed matrices, bounded path service, navigator and shared action arbiter in a six-tick disposable world. A road makes the direct route preferable; an immobile owned blocker occupies it. Assertions require the walker to remain at [20,20] for the first three observations, request avoidance false/false/true, take a tile beside the blocker, arrive at [22,20], and report done. The blocker must remain at [21,20] throughout, proving rerouting rather than displacement or removal.

Quality/Lizard passed with69 production files and zero violations. The complete13-case engine suite passed in11.60s, including injected failure/timeout controls; the runner now records the actual tick count per scenario. The focused recovery run used6 ticks with engine CPU7/1/1/1/1/1ms. These tiny fixture measurements include startup and are not representative empire CPU evidence. This closes the repeated-blocker recovery scenario gap only; multi-creep traffic arbitration, cross-room exits, body-cost profiles and production movement dispatch remain ED-18 work.

## Body/load mobility profiles

mobilityCosts now derives steady-state road/plain/swamp tick costs from effective MOVE recovery and weighted body/load. The Screeps adapter resolves boost constants and current store load. Pinned engine movement.js calcResourcesWeight iterates active CARRY parts from the end of the body, consuming boosted capacity per weighted part; non-MOVE/non-CARRY parts count even when damaged. creeps/tick.js removes twice effective MOVE power as fatigue. The implementation follows those inspected rules, clamps path costs to1..254 and reports no active movement separately.

These are route heuristics for the observed body, not a prediction of same-tick combat damage (_oldHits handling), pulling, safe-mode collision priority or current fatigue. Current fatigue remains the movement gate. Production navigation composition still must select these costs and include them in its profile/cache identity; the adapter is not yet wired into all movement callers.

Validation: 198 tests passed in2.81s; quality/Lizard passed with71 production files and zero violations. New tests cover unloaded/loaded CARRY, destroyed MOVE, damaged fixed body weight, boosted MOVE recovery and mixed boosted CARRY ordering. This milestone is pinned-engine source plus unit evidence; live-engine damage/load permutations remain outstanding.

## Traffic batch resolution

The pure resolver accepts one request/owner per unit, observed occupancy and an injected legal-step check. Priority then unit ID gives deterministic destination winners. Occupancy dependencies are pruned until stable: chains and cycles can move only if every required occupant has a surviving move; stationary/immobile occupants are never shoved. An optional group ID makes a set of moving formation members all-or-none at planning time. Group rejection propagates to outside requests depending on those members vacating tiles.

This is conservative selection: a rejected winner is not replaced by a lower-priority contender in the same batch. Callers may age priorities over ticks; no fairness claim is made. The default cap is1000 requests. Each pruning pass removes at least one candidate, but worst-case work is quadratic; representative traffic CPU/scale measurements remain required. Group planning is not transactional engine intent execution: later rejected intents or combat can still prevent part of a group moving. No formation combat parity is claimed.

Validation: 202 tests passed in2.45s; quality/Lizard passed with74 production files and zero violations. Tests cover contention order, chains, swaps, stationary/immobile blockers, group/dependency propagation, room identity and invalid observations. The --traffic actual-engine scenario issues the resolver's accepted swap through one shared action arbiter: a/b positions20/21 become21/20 on the following tick, while lower-priority contender c stays22. Both accepted calls return issued; c receives destination-conflict. Three engine ticks passed (CPU5/1/1ms in this small fixture).

Production collection/flush wiring remains outstanding; this resolver and its fixture are not yet the sole production movement authority. Cross-room destination occupancy requires engine-aware exit handling, not just world-coordinate adjacency. Legal-step callbacks must check range, terrain/structures and exit semantics; pure resolver tests using a permissive callback do not prove those rules.
