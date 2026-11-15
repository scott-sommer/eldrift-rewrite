# Layout strategy port (ED-24, in progress)

Reference: Eldrift-Directive f2bbf7e8c44addc7c426abb5458e393c9502ff5f.

The standard strategy delegates core placement, template construction and all source/controller/mineral/utility logistics to room.layout.shared.js. Its bootstrap selector searches placement again; the rewrite must select bootstrap from the committed eventual plan instead.

The constrained strategy has a compact terminal/link core, ten lab offsets, road offsets and separate service/utility placement recipes. Its search bounds are 36 anchors and 12 successful plans. These are legacy search policy, not evidence of globally optimal placement. Both strategies use room.layout.scoring.js.

## Service scoring characterization

service-score.ts ports scoreDistributorServicing as a pure typed function. Spawn weight is 8, extension weight 1; cost is Chebyshev distance times weight times 10, with up to three adjacent roads credited at weight times 4 each. Duplicate roads count once. Empty targets score negative infinity. The result exposes distance cost and road credit rather than hiding their contribution.

This legacy heuristic does not prove path connectivity, reachable service positions or hauling CPU. It must only contribute after hard candidate validation. Invalid coordinates now fail explicitly. Tests cover exact weighted arithmetic, diagonal distance, adjacency credit saturation, duplicate/order independence, empty targets and malformed positions.

## Remaining acceptance work

Port complete templates and constrained placement, incremental enumeration and checkpointing; validate legal sharing, stage counts, access, labs, paths and egress; add remaining score dimensions, deterministic selection/hysteresis, preserve-existing locks, provenance and staged bootstrap. Native planner integration and reset/CPU-budget scenarios remain unimplemented. No ED-24 acceptance criterion is complete yet.

## Standard footprint port

The full RAW_TEMPLATE is preserved as 128 storage-relative placements: 60 extensions, 43 roads, 10 labs, 6 towers, 3 spawns, and one each storage, terminal, link, power spawn, nuker and observer. The checked-in absolute-coordinate legacy fixture provides characterization independent of the relative representation. Tests reconstruct the original coordinates/order and verify all pairwise Chebyshev distances, unique occupancy and fixed storage anchor across all eight orientations. Generic template placement rejects the entire footprint when any tile violates room margins and returns independent positions.

Validation: npm run quality passed (328 production files, zero Lizard violations); npm test passed 616 tests in 188 files, 5.94 seconds. This proves footprint geometry only. RCL staging, placement eligibility, lab functionality, logistics attachments and strategy selection remain pending; no native integration is claimed.

## Progressive core stages

staging.ts ports assignProgressiveLevels using injected cumulative RCL limits, nearest-storage distance and legacy lexical coordinate tie-breaking. Delayed starting levels include all capacity already unlocked. Duplicate coordinates, malformed limits and excess RCL8 capacity now fail explicitly rather than allowing silent omission. Output positions are independent copies.

standard-core.ts composes all 128 core placements with the legacy minimum RCLs, priorities and core/storage tags. Roads remain RCL4 but are now deterministically distance/key ordered rather than raw template order; construction execution must use its explicit priority policy. Limits remain injected rather than embedded engine globals. The RCL1 spawn is part of the final footprint, but bootstrap selection and commitment are still pending.

Tests cover every extension batch, delayed starts, tie ordering, invalid inputs, serialization and each core structure count against every injected RCL limit. npm run quality passed (330 production files, zero Lizard violations); npm test passed 621 tests / 190 files in 6.44s. These are pure contract tests with fixture limits, not native engine evidence. Full candidate validation, logistics attachments and strategy integration remain outstanding.

## Reaction geometry and corrected staging

Inspected pinned engine src/processor/intents/labs/run-reaction.js: each output must be within two tiles on both axes of both reagent labs. lab-geometry.ts finds a deterministic row-major reagent pair serving every remaining lab, rejects duplicate coordinates, and returns no geometry for incomplete or disconnected clusters.

Characterization exposed a legacy defect: nearest-storage progressive lab ordering can yield an unusable intermediate cluster. lab-staging.ts now stages a pair selected for the entire final cluster first, followed by distance/key ordered output labs. This deliberately changes legacy lab build ordering while retaining footprint, counts and RCL capacities. The same reagent pair is available and reaches every output at RCL6, RCL7 and RCL8 under all eight standard transforms.

Tests retain a reproduction showing the legacy stages fail for some orientations, plus successful corrected stages, diagonal range boundaries, disconnected clusters and duplicate rejection. npm run quality passed (332 production files, zero Lizard violations); npm test passed 624 tests / 191 files in 5.93s. Evidence is pure geometry plus inspection of pinned engine rules; no native reaction execution or overall candidate validation is claimed. Terrain/occupancy sharing, access, egress and path checks remain outstanding.

## Constrained core port

constrained-template.ts preserves all 36 compact placements from LOCAL_CORE_STRUCTURES, LOCAL_LABS and LOCAL_ROADS: storage, terminal, storage link, ten labs and 23 roads. Two roads overlap lab tiles exactly as in the legacy design; their presence must never imply walkable service access through the labs. stageConstrainedCore preserves anchor margin three, terminal/link margin two and outer footprint margin one, tags, priorities and minimum levels. It reuses corrected reagent-first staging. Both strategies use a separate core-model contract rather than importing each other's implementation.

Checks: 627 tests / 192 files passed in 6.69s; subsequent shared type-only extraction passed npm run quality (335 production files, zero Lizard violations). Tests cover compact anchors, counts, overlaps, margin boundaries and reaction geometry at every lab stage in all eight orientations. This is only the constrained hub: service packing, anchor search, utility placement and logistics paths remain unported. Native candidate validation and overall ED-24 acceptance remain open.

## Candidate anchors

standard-candidates.ts ports previous-plan, storage, high-value structure alignment and central-grid seed enumeration. It deduplicates candidates, rejects out-of-margin complete footprints and retains every fitting result for later validation/scoring. Empty-room enumeration yields 110 anchors times eight orientations. This helper does not establish terrain eligibility or choose a winner, and its eager seed enumeration is not yet resumable planning.

constrained-anchors.ts preserves the legacy preferred-anchor, center-range, controller-Manhattan and stable insertion tie ordering. Existing plan/storage preferences can be supplied without memory reads. Default limit remains 36 and is configurable up to the room tile count. Duplicate anchors collapse and output copies do not mutate input. Invalid coordinates/search limits fail explicitly. Initial Lizard CCN 12 was corrected by extracting anchor pool construction; no exception added.

Validation: npm run quality passed (337 production files, zero Lizard violations); npm test passed 633 tests / 194 files in 7.06s. Tests cover exact central count, seed precedence, transforms, preservation alignment, deduplication, margin filtering, constrained ordering and adjustable search bounds. Full constraints, strategy completion, resumable checkpoints and native execution remain pending.

## Service candidate policy

service-candidates.ts ports the road-neighbour pool (margin two, storage range at most twelve, no road tile candidates), adjacency counts, spawn/tower/extension-specific score terms, utility scoring and lexical coordinate tie-breaking. Buildability is injected; callers must supply usable roads rather than treating lab-overlapped roads as walkable. There is no legacy length-based cache, avoiding stale geometry reuse when equal-length road sets change. Reservation, recipe sequencing and road-path construction remain separate work.

Checks: npm run quality passed (338 production files, zero Lizard violations). First full test run had one Lizard tooling subprocess timeout at 5 seconds; all product assertions passed. An unchanged rerun passed all 636 tests / 195 files in 7.68s. The timeout remains recorded rather than being hidden by a larger global timeout. Tests verify pool deduplication/filtering, exact adjacency and score arithmetic, deterministic ties and independent output copies. Native service connectivity remains unproven.

## Compact service packing

service-recipes.ts preserves the ordered legacy recipes: three spawns, six towers, sixty extensions, then optional observer/power spawn/nuker. service-packing.ts filters range, reservations and an injected type-specific placement predicate, ranks candidates, stages selected positions and reserves each selection. Required shortfalls return structure/count details without publishing a partial draft. Optional utility omissions are explicit output; they must feed capacity validation/scoring rather than silently masquerading as complete RCL8 capability. Caller inputs remain unchanged.

Tests cover all 72 placements on a sufficiently connected road fixture, stable selection after candidate reordering, RCL2 extension counts, distinct reservation ownership, required tower failure, explicit utility exclusion and space-driven power-spawn omission. Initial cross-road fixture lacked space for a power spawn after service packing; retained as a scarcity regression and added a larger network for complete packing. npm run quality passed (340 production files, zero Lizard violations); npm test passed 640 tests / 196 files in 6.51s. This is detached placement policy, not proof of path connectivity or a complete room strategy. Native integration, logistics attachments, validation and resumable planning remain outstanding.

## Planned connectivity validation

connectivity.ts overlays planned blocking structures onto an observed walkability mask using an injected movement policy. Roads never clear obstacles, regardless of placement order. Every supplied service/work/egress access group must intersect one common eight-connected component. Independently reachable but disconnected islands cannot pass. Empty or fully blocked groups are identified; zero requirements do not count as validated connectivity. Caller masks remain unchanged.

Regression fixtures cover a road/lab overlap severing a corridor, multiple access alternatives on disconnected islands and blocked/empty access groups. npm run quality passed (341 production files, zero Lizard violations); npm test passed 643 tests / 197 files in 7.37s. This is complete component analysis for the supplied mask and groups, not weighted path search, road-only connectivity, automatic access-group construction, stage validation or native engine evidence. The overall validation pipeline remains to be composed.

## Assessment-driven staged access

access-validation.ts composes ED-23 assessment with planned connectivity at each RCL1â€“8. Source/mineral requirements use assessed range-one work tiles; controller work uses range three. Service structures require an adjacent reachable tile (including spawn egress). Each assessed directional exit segment must remain reachable in the same component. Roads, ramparts and constructed walls do not themselves require service adjacency. This is a conservative preserve-all-exit-segments policy, not a terrain-aware defensive gateway policy.

Tests prove a spawn usable through RCL3 becomes rejected when RCL4 extensions enclose it, and lab construction blocks source access despite overlapping roads. Requirement tests check controller/source/mineral work ranges and exit grouping. npm run quality passed (342 production files, zero Lizard violations); npm test passed 646 tests / 198 files in 6.09s. Placement type/RCL legality, stage capacities, native movement policy, weighted paths and final strategy commitment remain separate pending validation/integration. No full ED-24 acceptance claim.

## Combined RCL capacity validation

capacity-validation.ts checks the combined desired draft at every RCL against injected cumulative limits. Separately valid core/source/controller modules can exceed shared capacity when composed; a three-link RCL5 regression demonstrates the failure and corrected RCL6 staging. Duplicate type/tile entries, unknown structure types and invalid RCLs produce explicit failure records. Malformed limit tables fail through the shared staging limit validator. Different types sharing one tile count separately; occupancy legality remains a separate concern.

Checks: npm run quality passed (343 production files, zero Lizard violations); npm test passed 649 tests / 199 files in 6.44s. These are desired-draft checks, not construction-site issuance checks or a migration model for old structures awaiting demolition. Placement legality and full pipeline/native integration remain outstanding.

## Preservation constraints

preservation.ts converts owned infrastructure of caller-selected valuable types into exact type/tile locks. Desired layouts must contain those placements, not merely replacements nearby. Keep-clear and blocked constraints reject all planned occupancy, including roads. Contradictory lock/clearance requirements cannot silently pass. Lock output is independently copied and diagnostic ordering is stable.

Tests cover ownership/type filtering, exact retention, moved or substituted structures, road clearance, contradictory requirements and malformed locks. npm run quality passed (344 production files, zero Lizard violations); npm test passed 652 tests / 200 files in 6.27s. This is desired-plan preservation only; current-RCL retention/migration sequencing, occupancy-sharing legality and selection/runtime integration remain pending.

## Composed structural draft gate

validateDraft now sequences capacity, exact constraints, required injected placement legality, staged reaction geometry and staged access. It stops with phase-specific diagnostics at the first failed gate. Invalid RCL entries cannot disappear from access filtering before capacity rejection. Shared StagedTile now lives alongside placement types rather than coupling capacity validation to the access validator.

This gate assumes reaction-capable clusters for any planned labs; specialist boost-only layouts will require an explicit lab-role policy rather than misusing that assumption. It does not yet validate weighted path completion, native placement rules, migration sequencing or scoring/commitment. A successful result means only the supplied structural checks passed, not that ED-24 or a release is complete.

Checks: npm run quality passed (345 production files, zero Lizard violations); npm test passed 655 tests / 201 files in 6.41s. Integration regressions cover early invalid-RCL rejection, mandatory placement rejection, preservation and incomplete reaction clusters.

## Terrain placement eligibility

terrain-placement.ts consumes already validated room terrain/object observations. It rejects absolute border tiles, protects fixed objects, requires extractors on minerals, allows roads through terrain walls and rejects other ordinary buildings on walls. Exit-adjacent structures require closed bordering terrain, except roads/containers. Inspected pinned engine utils.checkConstructionSite; corner placement conservatively checks both bordering edges instead of inheriting its last-assignment-only borderTiles behavior. This stricter corner policy is deliberate.

Tests cover wall-road exceptions, border rejection, exit exemptions/closed edges, minerals, source protection and corner behavior. npm run quality passed (346 production files, zero Lizard violations); npm test passed 659 tests / 202 files in 6.23s. This helper does not validate ownership, sharing, deposits (absent from current assessment model), construction-site sequencing or road tunneling's effect on future walkability. Those remain required integration work, along with native execution evidence.

## Combined placement eligibility

placement-validation.ts combines terrain/fixed-object eligibility with desired and observed structure conflicts. Pinned engine checkConstructionSite permits road/rampart overlays while rejecting competing ordinary buildings; the final occupancy predicate is symmetric. Matching observed structures satisfy desired placement rather than being treated as duplicate construction requests. Existing conflicting structures remain blockers; this helper never assumes demolition. Duplicate planned type/tile entries remain invalid.

Checks: npm run quality passed (347 production files, zero Lizard violations); npm test passed 662 tests / 203 files in 6.51s. Tests cover symmetric overlap rules, competing desired structures, retained observed conflicts, matching reuse and fixed-object rejection despite otherwise permitted overlays. Construction sites still require sequential issuance, and ownership/foreign structure policy and native execution evidence remain pending. Static eligibility is not evidence of a valid construction schedule.

## Native overlap scenario

--layout-placement runs the production sharing predicate alongside real Room.createConstructionSite calls in the pinned engine. On an existing spawn tile at RCL2, extension creation returns ERR_INVALID_TARGET (-7), road creation returns OK (0), and subsequent ticks retain the spawn plus road construction site without an extension site. The verifier checks three ticks, not only return codes. Registered in the packaged engine suite.

Evidence: engine-E83lGL/evidence.json passed, errors=[] and messages=[]. npm run quality passed (347 production files, zero Lizard violations); npm test passed 662 tests / 203 files in 5.92s. This proves these two native overlap cases and site persistence only, not construction completion, all sharing combinations, terrain cases or the full engine suite. The aggregate suite has not been rerun for this milestone.

## Candidate ranking and stability

selection.ts ranks only candidates accepted by a supplied hard-validation predicate. Six explicit nonnegative cost dimensions cover hauling, service, capacity shortfall, swamps, defense and migration; configured weights produce visible contributions and total cost. Stable codepoint identity ties avoid enumeration-order dependence. A still-valid previous candidate remains selected unless improvement strictly exceeds the configured threshold. Invalid previous candidates cannot be retained by hysteresis. Duplicate/empty IDs, invalid numbers and score overflow fail explicitly.

Tests use synthetic cost vectors to show configuration changing the selected strategy, invalid candidates being excluded before scoring, strict threshold behavior and stable ties. npm run quality passed (348 production files, zero Lizard violations); npm test passed 666 tests / 204 files in 6.34s. Actual cost measurement from complete room plans, identity/provenance persistence, revalidation of committed plans and native strategy selection remain pending. This is selection policy evidence, not proof that generated standard and constrained plans are already complete/viable.

## Logistics utility search port

utility-placement.ts ports findNearbyUtilityTile and findSourceLinkTile. The generic search retains range cost, preferred-target distance, road credit and legacy x-major equal-score precedence. Source links remain adjacent to the miner container (or source fallback), within two tiles of the source, and prefer storage-facing/road-adjacent positions. Availability/reservations and road observations are injected. Results remain optional when no tile fits.

Tests cover exact ties, target attraction, road preference, reserved-tile rejection, source/container geometry and clipped edges. Initial Lizard CCN11 was resolved through validation-method extraction. Final quality passed (349 production files, zero violations); 669 tests / 205 files passed in 6.56s. Container selection, full source/controller/mineral attachment, shared link-capacity scheduling and native plan integration remain pending.

## Container position search

container-placement.ts ports findAdjacentContainer with storage-distance cost, adjacent-road credit, neighbouring open-tile credit and x-major tie precedence. Buildability/reservations and open-space interpretation are injected; room borders are excluded and no suitable tile yields no placement. This keeps reusable selection separate from source/mineral policy and room observation.

Tests cover exact tie/storage preference, road/open-space effects, reservations, unavailable positions and edge clipping. npm run quality passed (350 production files, zero Lizard violations); npm test passed 672 tests / 206 files in 6.37s. Full infrastructure attachment and native layout integration remain pending.

## Resource infrastructure composition

resource-infrastructure.ts composes controller links, source containers/links and mineral extractors/containers with shared private reservations. It preserves legacy minimum levels, priorities and tags, deliberately keeps controller containers absent, and reports missing type/object placements explicitly. Objects are processed controller/source/mineral then stable ID, making source iteration deterministic. All observed minerals are handled rather than silently selecting only the first. Positions are cloned and caller reservations unchanged.

Output minimumRcl fields are proposals, not final construction stages. Core/controller/source/auxiliary links must be scheduled against shared room capacity after composition; this avoids repeating the legacy independent-group staging issue. Tests cover a controller/two-source/mineral composition, reservation uniqueness, stable order, metadata and total placement failure. Quality passed (351 production files, zero violations); 674 tests / 207 files passed in 6.12s. Factory/auxiliary placement, road connection, shared capacity scheduling and native complete-plan integration remain pending.

## Shared capacity scheduling

capacity-scheduling.ts assigns infrastructure minimum-level requests against already staged core entries and all future fixed capacity. Requests are ordered by minimum level, priority, type and tile; metadata is preserved. A proposed level must remain legal through RCL8, preventing a future fixed placement from causing overflow. Unsatisfiable capacity returns a named placement failure without a partial schedule. Invalid fixed drafts and duplicate requests fail explicitly.

Tests schedule core/controller/two-source links legally through RCL5/6/7, verify future fixed capacity reservation and cross-check output through the independent combined capacity validator. Quality passed (352 production files, zero violations); 677 tests / 208 files passed in 7.16s. This schedules desired structures, not live demolition or construction-site dependencies. Complete candidate composition, auxiliary placement, roads and native generation remain pending.

## Factory and auxiliary infrastructure

auxiliary-infrastructure.ts ports factory preference offsets and two auxiliary-link targets, retaining room-axis offsets rather than rotating them with the core (legacy behavior). Shared private reservations prevent collisions. Factory requests RCL7 at priority -260; auxiliary links request RCL8 at -345. Missing placements are explicit and do not suppress independent later proposals.

Tests verify metadata, exact unobstructed coordinates, factory reservation displacing the second link, unavailable factory behavior, existing reservations and scheduling two auxiliary links alongside four fixed links. Initial fixture expectation omitted the factory reservation; corrected with an explicit factory-coordinate assertion. Quality passed (353 production files, zero violations); final tests passed 680 / 209 files in 6.63s. Full plan assembly, road generation and native validation remain pending.

## Complete road connections

road-connections.ts builds a detached deduplicated road draft through an injected search port. Unlike legacy buildRoadPath, it rejects incomplete searches, invalid costs, nonadjacent path steps, blocked/unbuildable tiles and falsely complete paths that do not reach target range one. Any connection failure returns only target/reason, not the partial draft. Successful earlier roads become preferences for later connections. Metadata preserves each connection's search cost and step count. Zero-length searches succeed only when already within range.

Quality passed (354 production files, zero violations); 684 tests / 210 files passed in 6.31s. Tests cover successful paths, incomplete/false-complete/discontinuous results, blocked/buildability rejection, late failure atomicity, preferences and adjacent targets. This validates search output, not the search implementation itself. Native PathFinder cost-matrix adapter, constrained redundant paths, complete candidate assembly and reset/budget integration remain pending.

## Native planning road search

adapters/screeps/planning-road-search.ts wraps single-room PathFinder with an explicit operation budget, immutable base matrix, per-search clone, range-one target and returned path/cost/incomplete status. Supplied 2500-tile costs must be integer 1..255; preferred roads reduce traversable costs to one but never clear cost255 obstacles. The caller still owns assembling terrain, observed objects and planned blockers into the static cost array.

Extended --layout-placement native scenario verifies a four-step cost-eight corridor route, maxOps1 incomplete search, and a blocked corridor that remains incomplete despite a preferred-road hint on the blocker. Evidence engine-85HhCU passed, errors=[] and messages=[]. Quality passed (355 production files, zero Lizard violations); 684 unit tests / 210 files passed in 6.23s. Native aggregate suite not rerun. Full candidate assembly, cost-layer composition and resumable planning remain outstanding.

## Road cost-layer composition

road-costs.ts combines assessed terrain costs/walkability, observed roads, planned roads/buildings and constraints. Road discounts never clear observed obstacles or walls; planned blockers are applied after all roads, independent of input order. Keep-clear/blocked zones exclude construction routes, and locked blocking construction sites remain impassable. Configured swamp costs are preserved. Returned arrays are independent of assessment.

Tests cover swamp weighting, wall/source/observed tower/planned lab blockers, keep-clear and locked spawn constraints, existing road discounts, order independence and walkable containers. Quality passed (356 production files, zero violations); 686 tests / 211 files passed in 6.32s. This policy does not automatically tunnel through terrain walls despite terrain placement allowing roads there; explicit tunneling strategy and post-construction walkability remain separate. Full candidate assembly and native integration remain pending.

## Core and infrastructure assembly

attach-infrastructure.ts composes a supplied staged core with resource and auxiliary proposals, derives observation-backed placement/open-space/road policies, shares reservations across passes and schedules the combined requests against room limits. Missing-placement diagnostics remain explicit. Capacity failure returns no candidate entries. Successful output includes cloned core entries and logistics anchors for subsequent road generation.

Integration test uses the actual standard template with a controller, two sources and mineral in open terrain: 128 core plus ten infrastructure placements; no missing proposals; independent placement and capacity validators pass; six links stage at 5,5,6,7,8,8. Quality passed (357 production files, zero violations); 687 tests / 212 files passed in 6.79s. Roads, constraints/ownership final validation, constrained service integration, cost measurement and native complete-candidate generation remain pending. This is an assembled structure draft, not a committed complete plan.

## Structure-and-road draft integration

finish-draft.ts composes assessment, road cost layers, complete connection generation and final structural validation. Added logistics roads retain RCL4/priority -190; existing draft roads are deduplicated. Search or validation failure returns diagnostics without a successful draft.

The native --layout-placement scenario now builds the actual standard core, attaches controller/two-source/mineral/factory/auxiliary infrastructure, connects all ten anchors using native PathFinder, and passes combined placement/capacity/constraints/lab/access validation. It asserts road additions beyond the 138 structure/core-road placements and ten completed connections. Assessment is a controlled synthetic open-room fixture; native search executes in the pinned engine. This is not yet live-room observation or construction execution.

Final engine evidence engine-TmOoTK passed. Quality passed (358 production files, zero violations); 687 unit tests / 212 files passed in 6.88s. Initial typecheck found the engine obstacle union narrower than StructureConstant; replaced cast-based includes with a typed equality predicate. Constrained complete drafts, live observation, score measurement, resumable selection and commitment remain pending. Aggregate native suite not rerun.

### Reusable live observations

The Screeps assessment adapter now exposes observeRoomPlanningInput independently of snapshot construction. It returns plain terrain, fixed-object, infrastructure and constraint data for candidate generation; hidden rooms remain absent. Caller-provided constraint positions and terrain-cost settings are copied. Snapshot observation delegates to this same input boundary.

Validation: npm run quality passed (358 production files, 320 test files, zero Lizard violations); npm test passed 687 tests across 212 files in 6.58s. The eight-tick native room-assessment scenario passed (engine-Fw8tXF, errors/messages empty), including JSON round-trip equivalence of live inputs and the existing construction-site/manual-constraint invalidation checks. This establishes reusable observation input, not live candidate generation or resumable planning completion; ED-24 remains open.

### Standard candidate composition and live boundary

standardDraft evaluates one anchor/transform through core staging, early terrain/occupancy rejection, shared-capacity infrastructure assembly, complete logistics searches and final draft validation. Missing requested infrastructure fails explicitly rather than silently yielding a partial full-base candidate. This strict policy includes factory and auxiliary links. Candidate comparison, alternative strategies, scoring and commitment remain separate and pending.

observeStandardLayoutDraft supplies current visible-room observations, native CONTROLLER_STRUCTURES limits, native obstacle types and PathFinder; it does not mutate Memory or construction sites. Hidden rooms return a visibility failure. Unit tests cover footprint/terrain rejection, missing source infrastructure, shared link exhaustion and incomplete searches. The native layout-placement scenario now calls the composed standard strategy for the controlled complete fixture and checks live spawn-conflict/hidden-room rejection through the adapter. A successful live-world candidate is not yet evidenced.

Validation: npm run quality passed (360 production files, 321 test files, zero Lizard violations); npm test passed 692 tests in 213 files, 6.88s. Native --layout-placement passed (engine-ssDNYh, errors/messages empty). ED-24 remains open; constrained assembly, measured costs, resumable generation and commitment still require implementation.

### Constrained traffic-road primitive

Ported the primary/secondary search policy from legacy room.layout.strategy.constrained.js planHeavyTrafficRoads. Each target requires a complete primary path. A second search blocks primary interior tiles except the origin and tiles within range one of the target. Successful secondary paths are independently validated against those exclusions; incomplete/invalid secondary paths contribute no partial roads and expose a failure reason while retaining the primary. A later primary failure publishes no partial network. The native search adapter accepts per-search blocked tiles applied after preferred-road discounts, so road preferences cannot reopen the primary corridor.

Validation: 696 tests / 214 files passed in 6.69s; quality passed with 361 production files and 323 test files, zero Lizard violations. Native --layout-placement passed (engine-KWEFd1, errors/messages empty), including dual-lane and single-corridor PathFinder checks. This helper is not yet wired into complete constrained candidate assembly. Legacy targets are terminal and source/controller links/containers; integration must retain those targets and separately ensure mineral/factory utility access. Full candidate comparison, resumable planning and commitment remain pending under ED-24.

### Complete constrained candidate assembly and lab-access correction

constrainedDraft now composes the staged compact hub, resource/factory/auxiliary infrastructure, traffic routes, core-road connections, compact service packing and final complete-path/capacity/placement/lab/access validation. Required infrastructure and service shortages fail explicitly; optional legacy utility omissions are returned. All non-road/non-lab/non-storage infrastructure receives routes before packing (expanding legacy terminal/source/controller targeting to utility access). Usable core roads are connected before packing so service placements cannot cut their access. Roads sharing blocking labs are excluded from the service-road pool.

Native integration exposed the legacy enclosed centre lab at RCL8. The original template remains exported as legacyConstrainedTemplate for regression evidence. The corrected template relocates labs (0,-2) to (0,-5) and (0,-1) to (2,-3), adding a road at (0,-2). This opens a connected service corridor and reserves its centre against auxiliary placement. The corrected hub has 37 entries (24 roads); some roads still legally overlap labs and are not traversable. Tests prove the original access failure and corrected staged access in every orientation, alongside range-two reaction geometry for all lab stages.

The native layout-placement scenario now assembles and validates all eight constrained orientations on the controlled plain-room fixture using actual PathFinder, asserting 60 extensions, 3 spawns, 6 towers and 10 labs in each. Initial runs correctly rejected enclosed lab/auxiliary access and disconnected service routes; final engine-vZL8yx passed with errors/messages empty. Quality passed: 363 production files, 324 test files, zero Lizard violations. Final unit suite: 698 tests / 215 files, 6.60s. This is controlled-fixture evidence, not broad terrain qualification or live-room success. ED-24 still needs candidate comparison, measured scoring, resumable generation and plan commitment.

### Measured route costs

measureRouteCost measures independently weighted journeys against one fixed final road network. It records destination identity, path cost, steps, weight and contribution; rejects incomplete, discontinuous, blocked or unreached paths; and rejects duplicate identities, invalid weights and arithmetic overflow. Earlier measured journeys never become preferred roads for later measurements, preserving target-order-independent costs. draftRouteCosts applies the final obstacle/road cost field and returns separate hauling/service breakdowns with caller-owned destination and service-weight policy. This must follow hard draft validation.

Native --layout-placement now measures four hauling destinations and 63 service destinations on the validated standard fixture (spawn weight 8, extension weight 1). These are weighted PathFinder movement costs, not simulated throughput or CPU forecasts. Engine-fXHRZu passed with errors/messages empty. Quality passed for 365 production / 325 test files, zero Lizard violations. Final unit suite: 701 tests / 216 files, 6.39s. Remaining ED-24 work includes the other measured score dimensions, candidate ranking integration, configuration-driven strategy comparison, resumable generation and commitment.

### Capacity, swamp footprint and migration inventory

footprintCosts measures per-type desired/actual/missing capacity, unique planned swamp tiles (sharing counts once), new construction and unretained owned assets. Construction and retirement weights are explicitly supplied by policy; missing/invalid weights fail rather than defaulting to free work. Existing owned structures and neutral roads/containers can be reused. Hostile owned-type structures are not credited as reusable; fixed objects such as controllers are excluded from retirement inventory. Unretained assets are an advisory scoring inventory, not demolition instructions or a proven migration schedule. Duplicate planned entries are rejected.

Validation: quality passed, 366 production / 326 test files with zero Lizard violations. Final unit suite passed 706 tests / 217 files in 7.10s, covering shared tiles, type deficits, reuse, ownership, fixed objects, invalid inputs, immutability and ordering. No new engine behavior was introduced or native scenario claimed for this pure inventory step. Defense estimation and complete score/ranking integration remain pending, as do ED-24 resumable generation and commitment.

### Explicit barrier-cost evaluation

barrierCost accepts proposed rampart/wall tiles and named protected assets. It validates occupancy/terrain legality and manual clearance, then checks eight-neighbour separation from every traversable room-border entry. Natural walls and supplied intact barriers block this conservative flood; ordinary structures do not count as permanent defenses. Exposed assets return a failure, not a cheap score. Accepted barriers return explicit per-type weighted tile cost. An asset directly overlaid by its rampart is protected under this intact-barrier model.

This is static separation and inventory cost, not attack endurance, tower coverage, ranged standoff, friendly gate routing, RCL scheduling or a defense-generation strategy. Those broader requirements remain ED-26; full-plan locked-structure validation remains the draft validator's responsibility. ED-24 still requires score composition/ranking, resumable generation and commitment. Unit regressions cover diagonal leaks, natural-wall closure, overlays, illegal walls, duplicate/type errors, absent assets and manual clearance. Quality passed (367 production / 327 test files, zero Lizard violations); 712 tests / 218 files passed in 5.84s. No native combat scenario claimed.

### Unified validated evaluation and measured strategy choice

evaluateDraft runs structural validation before barrier separation and route/inventory measurement. It emits either a phase-specific failure or all six cost dimensions plus detailed route, footprint and defense evidence. Defense barriers are part of the same staged entries, so capacity, placement and access checks include them.

Native fixture comparison supplies explicit RCL4 rampart overlays (a test defense policy, not automatic defense generation) and equal per-tile construction weights. Standard costs: hauling 71, service 307, capacity shortfall 0, swamps 0, defense 85, migration 274. Constrained costs: hauling 64, service 337, capacity shortfall 0, swamps 0, defense 85, migration 303. Production selectLayout chooses standard with service-only weights and constrained with hauling-only weights. Existing unit tests verify deterministic ties, contribution arithmetic, strict hysteresis thresholds and rejection of invalid previous candidates.

Final quality passed: 368 production / 329 test files, zero Lizard violations. Unit suite passed 715 tests / 219 files in 6.69s. Native --layout-placement passed engine-OGnh2v with errors/messages empty, including both measured selections and all eight constrained orientations. ED-24 scoring-breakdown criterion is evidenced. Full strategy enumeration/composition, resumable checkpoints, versioned commitment and live-room qualification remain unfinished; ED-26 still owns defense generation and broader defensive validation.

### Resumable standard candidate enumeration

standardCandidateSource exposes a random-access raw sequence (previous anchor, storage transforms, structure alignments, then the 880 central-grid orientations) without materializing all grid candidates. standardCandidateBatch bounds raw attempts, checks an injected CPU guard before consuming each ordinal, and returns detached candidates plus a versioned JSON-safe cursor/deduplication history. The seed signature rejects stale continuation. Invalid coordinates from an alignment consume an attempt, so rejection work is included in the batch bound.

Tests serialize/restore every seven attempts and compare the entire result against the existing independent eager generator, including previous/storage overlap and edge structure alignments. They also cover zero budget, CPU yielding, stale inputs, malformed cursor values and completed-checkpoint idempotence. Quality passed (370 production / 330 test files, zero Lizard violations); 719 tests / 220 files passed in 7.76s.

This bounds candidate enumeration only. Seed-alignment preparation and signature/history copying still happen at batch entry; expensive candidate construction/scoring is not yet resumable, and no actual engine CPU termination/reset recovery is claimed. ED-24 checkpoint acceptance remains open until the full planning lifecycle is integrated and exercised. The eager generator remains available as the characterization reference during this transition.

### Shared strategy enumeration mechanism

candidateBatch now owns ordinal progress, deduplication, budget/CPU yielding and checkpoint validation for both strategies. Standard retains its prior checkpoint signature. constrainedCandidateBatch enumerates the deterministic configured anchor list in all eight orientations and uses a strategy/version-prefixed signature, rejecting cross-strategy or changed-option continuation. constrainedFootprint is shared by enumeration and core staging, eliminating duplicated eligibility geometry.

Constrained tests restore JSON checkpoints every three raw attempts, compare exact anchor/orientation order, include rejected edge anchors, and verify CPU yielding and stale/cross-strategy rejection. All standard enumeration regressions remain passing. Quality: 373 production / 331 test files, zero Lizard violations. Unit suite: 721 tests / 221 files in 6.38s. Native --layout-placement engine-gGF64O passed with errors/messages empty and unchanged measured strategy costs, including all eight constrained builds. Full build/score checkpoints, actual native reset/CPU exhaustion recovery and commitment remain pending. Constrained anchor sorting is bounded by the room-sized pool but still happens before each scan batch.

### Per-search route-score checkpoints

measureRouteBatch checkpoints completed independent journeys, bounds searches per call and checks an injected CPU guard before each search. Partial batches expose no total; only completion yields the total score. Failed or interrupted searches leave that destination pending and never mutate the caller's saved checkpoint. Checkpoints include version, target/network signature and measured contributions; restored identities, arithmetic, finite costs and step counts are validated. The caller-provided network revision must cover final costs/walkability, search settings and algorithm version.

Unit evidence: 725 tests / 222 files passed in 6.85s, including serialized resume equivalence, no replay, yielding, exception safety, stale networks and corrupted measurements. Final quality passed with 375 production / 334 test files, zero Lizard violations. Dedicated native --planning-route-resume passed engine-Xi3kjH (one search in tick 1, one in tick 2, none in tick 3; final cost 20). Native --layout-placement passed engine-ZjKnDh. Both have errors/messages empty. Adding checkpoint work to the already large layout fixture initially caused a script timeout; scenarios were separated rather than increasing the timeout, and the new scenario is registered in the full suite.

This proves native cross-tick Memory persistence, not forced VM reset or hard CPU-termination recovery. Full candidate orchestration and build checkpoints are still pending under ED-24. Network revision construction and storage ownership must be integrated by the planning coordinator.

### Native reload of planning checkpoints

The dedicated --planning-route-reload scenario updates bot code and invalidates native cached script data between ticks 1 and 2. A module-local call counter changes from [1,2,3] in the ordinary-resume control to [1,1,2] under reload, proving module state was recreated. A load-time witness observes one saved route and candidate ordinal 2 before the resumed loop. Candidate enumeration then reaches ordinals [2,4,6], and route searches remain [1,1,0] with final cost 20.

Quality passed unchanged production limits (375 production / 334 test files, zero Lizard violations). Reload scenario engine-zYRdJD passed with reload provenance recorded; ordinary control engine-xejiSi passed without reload provenance. Both errors/messages empty. Both scenarios are registered in the full native suite. No production behavior changed, so verification focused on quality and these native cases rather than repeating the unchanged unit suite.

This establishes code/module reload survival for enumeration and route-score checkpoints. It does not yet prove hard CPU termination recovery, an entire resumable candidate build, preservation/commitment of the last valid plan, or live automatic planning. ED-24's combined checkpoint criterion remains open.

### Guarded plan commitment and provenance

Extended the existing planning schema to v3 rather than introducing parallel state. Optional provenance records candidate/strategy version, observation and policy fingerprints, generation/commit ticks, anchor/transform, all score dimensions and bootstrap placement keys. Bootstrap spawn must be an RCL1 entry and storage must exist in the same staged plan. v1/v2 migrations preserve entries and dependencies without fabricating provenance for old/operator plans.

createPlanStore uses existing versioned-state ownership and plain-data copying. Commit requires the expected revision, matching observation/policy context, valid schema, retention of operator placement identities and an explicit fresh-validator callback. It rechecks revision after validation and writes only on success. Rejected candidates leave current entries/revision untouched; caller/validator mutations cannot alter committed data. Operator identity retention is not a substitute for preserve-existing structure locks or full layout validation, which the coordinator must supply. This API is not yet wired into automatic planning and does not provide a full rollback history.

Quality passed: 377 production / 335 test files, zero Lizard violations. Final unit suite: 731 tests / 223 files, 6.89s. Native --work-dependencies engine-YX4cV6 passed with errors/messages empty, demonstrating construction dependency compatibility with v3 (before the final provenance-only nonempty-strategy guard, covered by unit regression). ED-24 still requires orchestration, full resumable build/score integration and end-to-end commitment/reload evidence.

### Generated draft to persistent proposal conversion

createPlanProposal converts staged strategy output to existing PlanEntry records while retaining required priorities, optional tags/resource object IDs, operator source and dependencies. It rejects missing priorities rather than inventing defaults. It derives one RCL1 bootstrap spawn and storage from the final entries, requiring storage to match the candidate anchor. Returned proposals are detached plain data. The v3 schema now validates optional tag/objectId strings; older records remain compatible.

Native standard and constrained fixture outputs are converted and checked against the persisted schema, including source association s1. Quality passed: 378 production / 336 test files, zero Lizard violations. Unit suite: 733 tests / 224 files, 6.73s. Native --layout-placement engine-z5KRkv passed with errors/messages empty and unchanged cost comparisons. The broad fixture's first tick measured 376 ms CPU; this is a test workload containing multiple complete candidates, not an acceptable automatic-planning tick budget. Full coordinator budgeting remains necessary. Actual generated-proposal commitment through native Memory, planner orchestration and hard termination recovery remain pending.

### Native generated-plan commitment and reload

Dedicated --planning-commit generates a standard candidate using native PathFinder over the controlled observation fixture, measures its defended layout, converts its staged metadata/provenance and commits through createPlanStore/createMemoryPort with fresh structural validation. A native code reload before tick 2 resets the module counter while preserving revision 1. Tick 2 proposes a spawn on a source (with internally consistent bootstrap metadata) and is rejected by validation. Tick 3 proposes a stale observation and is rejected before replacement. Exact serialized committed state remains identical across all ticks; the verifier checks envelope v3, extension count, source associations and commit timestamp.

Quality passed (378 production / 338 test files, zero Lizard violations). Native --planning-commit engine-ecZ6hd passed with reload provenance; --layout-placement engine-1CD54V passed with unchanged measured strategy selection. Both errors/messages empty. No production changes; targeted native checks cover the new scenario and shared proposal helper. The new scenario is registered in the full suite.

Combined with the existing configuration-choice regression, versioned serializable staged plans/provenance and bootstrap-to-final-plan identity are now evidenced for ED-24. The scenario uses controlled room observations; it is not live automatic planning or a full migration rehearsal. Automatic orchestration, bounded full candidate construction, hard CPU termination and broad room qualification remain pending.

### Resumable road connection construction

connectRoadBatch bounds path searches per call and checkpoints completed connections plus their accumulated preferred roads. JSON-restored batches match uninterrupted connectRoads output; incomplete paths never add tiles or consume their destination. CPU yielding and thrown search interruptions preserve saved progress. Checkpoint validation covers network signature, target identities, connection measurements, duplicate roads and retention of original roads. Pending checkpoint roads remain draft data and must not be published as a complete plan.

Quality passed (380 production / 339 test files, zero Lizard violations). Unit suite passed 737 tests / 225 files in 7.11s. Extended native reload/control scenarios passed engine-DhUKeP and engine-tKrPqJ, errors/messages empty: one connection per tick, persisted four-road network, native connection costs [8,3] confirming road reuse, and no searches after completion. Load-time witness confirms the first connection survives code reload together with enumeration/scoring checkpoints.

The new mechanism is not yet wired into standard/constrained candidate assembly; alternate-lane construction and full planner orchestration still require phased continuation. Hard CPU termination remains unverified. ED-24 checkpoint acceptance stays open.

### Standard candidate construction with bounded road searches

standardDraftFoundation separates core/infrastructure preparation from road completion. finishDraft now shares road preparation and final validation with finishDraftBatch; standardDraftBatch connects that bounded path to real standard candidates. Pending results expose a checkpoint and search count, not completed entries. Checkpoint revision includes staged entries, observation, limits, derived costs and caller search revision; storage/targets are also signed by the road checkpoint.

Native --standard-draft-resume builds the ten logistics connections one per tick, reloads code after connection five, and compares final entries/connections exactly against uninterrupted standardDraft. It completes at tick 10 and issues no searches on ticks 11/12. The fixture passes engine-zY6xgz with errors/messages empty. CPU samples were [82,15,12,11,13,43,14,13,11,32,25,24] ms; tick 1 also computes the uninterrupted reference, tick 6 reloads, and completion revalidates. Preparation/assessment still repeat, and completed calls revalidate, so this is a path-search bound rather than a whole-tick CPU budget.

Quality passed (382 production / 341 test files, zero Lizard violations); 738 tests / 226 files passed in 7.36s. Synchronous --layout-placement engine-BKRgZC passed errors/messages empty with unchanged costs, including constrained candidates. New resume scenario registered in full suite. Constrained alternate-road continuation, coordinator integration, cached preparation and hard CPU termination remain pending under ED-24.

### Resumable traffic lanes (ED-24)
Traffic road generation now has a separate serializable checkpoint and bounded-search batch helper.
Each primary and alternate search consumes one slot. A checkpoint between searches retains the
primary connection and excluded interior tiles; an unavailable alternate preserves the primary
and records its failure. A failed mandatory primary does not advance. Restores validate revision,
target identities, lane phase, costs, original roads and blocked-tile membership; callers must
include terrain, constraints and search-policy changes in the supplied revision.
Pending networks remain drafts, never published layout plans. Inputs are detached before work,
so a thrown search cannot mutate a previously persisted checkpoint.

Validation: quality passed (384 production / 342 test files, zero Lizard violations);
743 unit tests / 227 files passed in 8.87s. Native layout-placement engine-eZaz18 passed
with empty errors/messages, including JSON-resumed native alternate routing equal to uninterrupted
routing. This native check resumes within one tick; it is not a runtime-reload or hard-CPU-kill proof.
The helper is not yet wired into constrained draft orchestration, core-road stitching, service
packing, or its final connectivity pass. Full constrained continuation remains unfinished.

### Constrained draft continuation (ED-24)
The constrained draft now composes traffic-lane batching, core-road stitching and final
connection batching under one search budget. Foundation preparation and service packing
are extracted and shared with the synchronous strategy. Pending results omit entries;
only the completed, structurally validated draft exposes them. Observation, entries,
limits, costs and caller search revision bind the road checkpoints. Changed observations
reject restoration; failed core stitching rejects the draft. The last committed plan is
not touched by this capability.

Native --constrained-draft-resume (engine-ouDZZi) ran 70 ticks with one search per tick,
actual code/runtime reloads before ticks 6 and 36, all three routing phases observed,
and exact final entries/connections/lanes/omissions equal to the uninterrupted strategy.
Completed calls performed no more searches. Status passed, errors/messages empty.
--layout-placement (engine-KqGKED) also passed, preserving eight-orientation assembly
and measured strategy selection. Quality passed for 387 production / 344 test files,
zero Lizard violations; 747 tests / 228 files passed in 7.24s.

Measured native scenario CPU: 9–108 ms, average 17.73 ms over 70 samples. First sample
includes the uninterrupted comparison computation. Final total fixture Memory was
216,471 bytes, including reference draft, checkpoints and diagnostic rows; this is not
an isolated production checkpoint measurement. Assessment, foundation and service packing
are still recomputed on resumed calls; final validation repeats after completion.
Search count bounds are not a whole-planner CPU bound. Checkpoint fingerprint size,
preparation caching, candidate orchestration, live-room qualification and hard CPU
termination testing remain outstanding before ED-24 completion.

### Exact compact checkpoint identities (ED-24)
Measured the constrained checkpoint separately from reference data and diagnostics:
baseline engine-0PEgjK contained 183,798 serialized characters, of which 131,905
were signature characters before outer JSON escaping. Repeated terrain/cost cells now
use tagged value/count runs inside the shared draft revision. Irregular sequences keep
raw arrays whenever that representation is shorter. This is lossless identity comparison,
not a probabilistic hash. Cell order, lengths, values, observations, placement metadata,
limits and caller search revision remain significant. Road checkpoint signatures still
bind origins, roads and targets separately. The new draft-revision-v2 identity deliberately
rejects old in-flight draft checkpoints as stale; committed plans are unchanged.

Controlled result: 65,909 checkpoint characters and 43,968 signature characters,
a 64.1% checkpoint reduction. These fixtures use ASCII, so character counts also match
UTF-8 byte counts here; this equivalence is not assumed for arbitrary room/operator data.
Total fixture Memory fell from 216,552 to 98,661 bytes. Engine-JbZ2wz retained exact
layout output through both runtime reloads. Its CPU average was 17.76 ms versus
18.24 ms baseline, too small/noisy a comparison to claim a CPU performance improvement.
A fixture-specific 80,000-character checkpoint gate passed in engine-Uk6xFM.
Standard continuation also passed in engine-XtzwHq. All four evidence records report
passed with empty errors/messages.

Quality: 388 production / 345 test files, zero Lizard violations; 751 unit tests /
229 files passed in 6.99s. Tests cover lossless round trips, no representation expansion,
all 511 binary sequences through length eight having distinct identities, changed
terrain/cost cells and policy/metadata invalidation. Preparation caching and whole-planner
CPU bounds remain open; compact signatures reduce persistence overhead only.

### Caller-owned assessment reuse (ED-24)
Layout preparation accepts an optional assessment provider. A caller-owned single-entry
heap cache now reuses an exact unchanged observation across infrastructure attachment,
traffic preparation and final road preparation. Both synchronous and batched strategies
receive the same narrow dependency. The default remains direct assessment; no global
cache or game objects are introduced. A runtime reload loses the cache and safely rebuilds
it from the observation. Changed terrain, objects, infrastructure ownership, constraints,
cost policy or margin invalidate it using exact serialized observation identity.
The detached assessment result is recursively frozen to prevent consumer mutation;
the input observation remains mutable and unfrozen. Failed builds do not replace the
last successfully cached observation.

Native constrained engine-xl2sln and standard engine-eEEbJR passed with empty errors/
messages. Both bots assert exactly one assessment build per runtime, including rebuilt
runtimes after code reloads, while preserving exact uninterrupted-layout equivalence.
Constrained checkpoint remains 65,909 characters and total fixture Memory 98,661 bytes.
Constrained 70-tick average CPU was 10.21 ms (3–105 ms), versus 20.31 ms (9–114 ms)
in preceding uncached engine-Uk6xFM. This is local fixture evidence, not a deployment
budget guarantee; the first tick includes an uninterrupted reference computation.
Standard averaged 19.92 ms (3–93 ms) across its short 12-tick fixture.

Quality passed: 389 production / 346 test files, zero Lizard violations; 754 tests /
230 files in 7.57s. Unit tests cover equivalent reconstructed inputs, deep immutability,
in-place invalidation, single-entry eviction, failed builds and fresh runtime recreation.
Foundation generation, service packing, exact signature scans and final validation still
repeat; whole-planner CPU bounds and automatic candidate coordinator wiring remain open.

### Resumable candidate coordination (ED-24)
The planning feature now owns a serializable candidate job, separate from geometry,
strategy evaluation and plan commitment. A revisioned, random-access candidate source
and incremental evaluator are injected. Each invocation can bound evaluator steps and
yield via a guard. Pending evaluator state survives JSON serialization; input observation,
policy, source revision/count, expected plan revision, weights and switching threshold
bind the job identity. The source owner must change its revision when ordering or
candidate content changes. Changed pending IDs and duplicate candidate IDs are rejected.

The job evaluates every supplied candidate, retaining only the best full proposal and
a re-evaluated previous proposal for hysteresis, plus compact seen IDs/rejection diagnostics.
It never exposes a selection while candidates remain. Hard validation precedes ranking
and runs again before a selected proposal is exposed; final invalidation returns no
proposal. Ties use stable IDs. Rejected candidates cannot win. Candidate inputs, evaluator
checkpoints, validator inputs and returned proposals are detached from previously saved
state. Exceptions cannot mutate a previously persisted checkpoint. Commit remains the
existing separate revision/freshness/validation-guarded store operation.

Native --planning-job (engine-VtLP6Q) passed 90 ticks with reloads before ticks 6 and 36.
It used real standard and constrained batch generation, native PathFinder, measured scoring
and fresh structural validation. The first completed candidate did not commit. After both
were evaluated, hauling-only weights selected constrained (cost 64), committed at tick 67,
with 60 extensions. Prior ticks retained revision zero; later ticks retained revision one.
Errors/messages empty. Average CPU 10.62 ms (4–135 ms); total fixture Memory 148,433 bytes.
This scenario uses two fixed candidates and a fixture defense overlay. Scoring still runs
synchronously in a separate evaluator step; the job bounds evaluator calls, not their CPU.
The runtime's full candidate enumerators, production evaluator/policy, durable job store and
automatic scheduling are not wired yet. It is not evidence of hard CPU termination safety.

Quality: 392 production / 349 test files, zero Lizard violations; 764 tests / 231 files
passed in 6.59s. Unit coverage includes JSON continuation, all-candidate selection,
hysteresis, rejected candidates, ties, stale inputs, guard yielding, exceptions and
evaluator/validator mutation isolation. No ED-24 acceptance item is newly closed.

### Versioned durable job store (ED-24)
Planning progress now uses the shared versioned state port under planning-jobs/<room>,
owner planning-jobs, schema version 1. Its revision is independent of planning/<room>.
The store validates cursor/seen IDs, pending/rejection metadata and retained proposals
against the existing staged-plan/provenance schema. Evaluator checkpoint payloads must
be plain JSON; their strategy-specific validity remains the evaluator's responsibility.
Reads and saves detach data. Stale writers cannot save or clear newer revisions.
Changed job identity cannot silently replace progress: callers explicitly clear the
expected revision before starting another identity. Clearing progress never touches
the committed plan. Corrupt, wrong-owner and future-version records throw without
overwriting evidence.

The native --planning-job fixture now reads/writes this store instead of an ad hoc
Memory property. Engine-eS0Jle passed 90 ticks, both code reloads, job envelope version/
owner checks and 67 progress revisions, selecting and committing constrained at tick 67.
The committed plan stayed revision zero before selection and one afterward. Errors and
messages were empty. Total fixture Memory was 148,528 bytes. Average CPU 18.52 ms
(7–139 ms), higher than the earlier unvalidated ad hoc storage scenario; schema/copy
cost remains material. Removing redundant reads reduced an initial store run average
from 21.14 ms, but these single local runs are not a firm performance guarantee.
Validation still occurs before every write.

Quality: 394 production / 350 test files, zero Lizard violations. Full unit suite:
770 tests / 232 files in 7.00s. After removing redundant reads, the six store tests
passed in 268 ms and native continuation passed again. Tests cover detachment,
revision conflicts, explicit identity reset, committed-plan preservation, future/corrupt
envelopes, invalid evaluator payloads and retained proposal/schema failures.
Production scheduling, job invalidation/retirement policy, commit-window recovery,
complete candidate enumeration and incremental score evaluation remain open.

### Recovery after plan write, before acknowledgement (ED-24)
commitPlanOnce wraps the existing guarded plan store. A normal write still goes through
schema, preservation, freshness and fresh validation checks. If the caller retries from
the old expected revision, recovery succeeds only at exactly expectedRevision + 1 and
when strategy, ordered entries and all proposal provenance values match the stored plan.
The stored committedAt is retained. Object property insertion order is irrelevant; array
order and values are significant. Different proposals, later revisions and changed
observation/policy context are rejected. Recovery acknowledges an existing write and
does not revalidate or rewrite it; it is not approval to apply new world actions.

Native --planning-job engine-AXnuAq deliberately saves the selected plan at tick 67
without acknowledging completion, then reloads code before tick 68. The resumed job
recovers the exact stored commit, acknowledges completion, and retains plan revision one
and committedAt 67 through tick 90. Its job progress revision becomes 68; the earlier
reloads at ticks 6 and 36 still pass. Errors/messages empty. This exercises the
write/acknowledgement window, not actual hard CPU termination during Memory serialization.

Quality passed: 395 production / 350 test files, zero Lizard violations. 773 unit tests /
232 files passed in 7.26s. Recovery tests verify no validator invocation or revision bump
on exact retry, full proposal mismatch rejection, stale context, later revision rejection
and property-order independence. Automatic runtime scheduling, job retirement/invalidation,
full candidate enumeration, bounded scoring and hard termination evidence remain open.

### Incremental six-dimension score evaluation (ED-24)
Hauling and service measurements now share one bounded route-search budget through
draftRouteBatch. Partial results expose checkpoints, not completed score totals.
Both phases bind the draft/observation/cost field and scoring weights; failed routes
remain candidate failures. Search counts include work consumed before a later-phase
failure. evaluateDraftBatch shares structural/barrier validation and final score assembly
with synchronous evaluation, emitting six-dimensional costs only after all routes finish.
Non-route scoring policy is included in the checkpoint revision. Both paths accept the
caller-owned assessment cache.

The native planning job now advances scoring one route search per evaluator invocation.
Engine-V9HBf8 passed 230 ticks, including reloads before ticks 6, 40, 91, 160 and 200:
both candidate generation and both in-progress scoring phases survived reloads.
Constrained committed at tick 199 and recovered its unacknowledged commit at 200.
All costs match the previous synchronous result exactly:
hauling 64, service 337, capacityShortfall 0, swamps 0, defense 85, migration 303.
Eight-orientation synchronous regression engine-WQPZuh also passed; both evidence files
have empty errors/messages. Final job fixture Memory 159,849 bytes; CPU averaged
26.97 ms (7–94 ms). Route count is bounded, but repeated structural/barrier validation
and persistence remain material costs. This is not a whole-planner CPU guarantee.

Quality: 397 production / 351 test files, zero Lizard violations. Full suite passed
777 tests / 233 files in 7.32s before a final failure-accounting test; all five affected
route-batch tests then passed in 343 ms. Coverage includes exact JSON-resumed breakdowns,
weight/terrain invalidation, guard yielding, empty routes, late failure and cross-phase
search accounting. Runtime scheduling, full enumeration, validation/preparation budgeting,
job retirement and hard CPU termination remain open.

### Complete configured candidate enumeration (ED-24)
The planning feature now composes standardCandidateBatch and constrainedCandidateBatch
under a shared raw-attempt budget. Serialized progress retains fitting unique candidates
and each strategy's cursor. A coordinator-compatible random-access source is exposed
only after every enabled strategy finishes; its identity binds all enumeration options.
Standard candidates precede constrained candidates, retaining each strategy's established
seed/anchor/transform order. Strategies may be disabled independently. Changed options
reject restoration. Candidate and accessor results are detached, and enumeration is
limited to the coordinator's 10,000-candidate safety bound rather than silently truncated.

Unit characterization compares the complete result against independent standard eager
enumeration and constrained anchor/orientation placement. A coordinator integration test
visits every enumerated candidate (using a rejecting test evaluator), proving there is
no first-fit truncation at the source boundary. This is not a live-room viability test.

Native --planning-route-reload engine-oWAcdw passed across the tick-2 runtime reload:
attempt batches 400/400/376 produced 400/800/1,176 candidates, exposing the source only
on completion. It retained 888 standard and 288 constrained candidates, unique stable IDs,
and known strategy boundary order. Existing road/route checkpoint checks also passed.
Errors/messages empty. Total fixture Memory 138,148 bytes; CPU 13–47 ms, average 33.33 ms
for these deliberately large enumeration batches. Snapshot copying/anchor preparation is
not bounded by the attempt count; smaller runtime budgets remain a scheduling concern.

Quality: 398 production / 353 test files, zero Lizard violations; 782 unit tests /
234 files passed in 6.89s before the native-only fixture addition. Production scheduling,
enumeration-state ownership/retirement, complete live-room evaluation, whole-planner CPU
bounds and hard termination evidence remain unfinished.

### Production strategy/evaluator contracts (ED-24)
Candidate generation, incremental scoring and proposal creation now compose in production
planning modules. createLayoutStrategies adapts standard and constrained draft batches
behind versioned advance contracts, explicitly adapting standard searches to omit alternate
lane exclusions. createCandidateEvaluator accepts this strategy map, observation/policy/
search identities, search budget, continuation guard, clock and scoring-input preparation.
It supports additional injected strategies without changing evaluator dispatch. Unknown
strategy names reject explicitly; candidate, policy and strategy-version changes invalidate
saved progress. Generation completion becomes a score-phase checkpoint, never an unscored
proposal. Proposal/bootstrap construction failures reject the candidate cleanly.

The scoring-input callback owns defense preparation and score policy. The native fixture
still supplies its explicit per-asset rampart overlay; this is not an automatic defense
planner or ED-26 implementation. The production evaluator and adapters do not import
fixture or engine globals. Job persistence/selection/commit remain separate responsibilities.

Native --planning-job engine-XluzMO passed all 230 ticks and five reloads using the
production evaluator. All six costs, constrained selection, tick-199 commit, tick-200
recovery, source associations and store assertions remain unchanged; errors/messages empty.
Quality: 400 production / 354 test files, zero Lizard violations. Full suite passed
787 tests / 235 files in 7.39s before the final bootstrap-rejection case; final affected
evaluator suite passed six tests in 341 ms. Tests cover extension dispatch, unknown
strategies, detached continuation, identity/version invalidation, phase boundaries,
failure reasons, budget checks and missing-bootstrap rejection.
Automatic scheduling, lifecycle policy, complete live-room qualification and whole-planner
CPU/hard termination evidence remain unfinished.

### Planning lifecycle and durable completion receipts (ED-24)
runPlanningCycle now composes the job store, coordinator and exact commit recovery.
It resumes matching work, explicitly clears stale unfinished job identity before restarting,
and refuses an unstarted request superseded by a newer committed plan. Completed jobs
become compact receipts instead of retaining full candidate/evaluator checkpoints.
A receipt records the request signature, outcome, plan revision and completion tick.
An unchanged request with the same plan revision remains idle; rejected/no-candidate
requests also remain idle until their input identity changes. Callers must supply the
current request and explicit base revision; global scheduling/trigger policy is separate.

Job schema v2 migrates v1 progress unchanged and permits either a checkpoint or receipt.
Receipt writes use the job revision guard, so losing acknowledgement after a plan write
leaves recoverable progress. The lifecycle validates tick/step budgets before mutations.
Committed plan records retain their independent schema and revision.

Native --planning-job engine-aA5A1l passed 230 ticks with reloads at 6/40/91/160/200/210.
It deliberately rejects the receipt write after the tick-199 plan commit, recovers at 200,
retires the full checkpoint into a v2 receipt at job revision 201, and stays idle through
the post-retirement reload at 210. Plan revision remains one, committedAt 199; all six
costs remain unchanged. Errors/messages empty. Total fixture Memory 111,633 bytes.
Average CPU was 62.46 ms (7–158 ms), materially expensive; this lifecycle is functionally
validated but not qualified for ordinary runtime CPU budgets. Repeated copying/validation
and integration overhead need profiling and bounded preparation before automatic scheduling.

Quality: 402 production / 355 test files, zero Lizard violations. 794 tests / 236 files
passed in 7.36s. Coverage includes completion/recreation idleness, lost acknowledgement,
changed-input restart, superseded requests, failed-search receipts and v1-to-v2 migration.
Production runtime scheduling/trigger policy, enumeration persistence, live-room qualification,
whole-planner CPU bounds and hard termination evidence remain open.
