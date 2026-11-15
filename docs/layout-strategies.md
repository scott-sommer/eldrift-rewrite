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

access-validation.ts composes ED-23 assessment with planned connectivity at each RCL1–8. Source/mineral requirements use assessed range-one work tiles; controller work uses range three. Service structures require an adjacent reachable tile (including spawn egress). Each assessed directional exit segment must remain reachable in the same component. Roads, ramparts and constructed walls do not themselves require service adjacency. This is a conservative preserve-all-exit-segments policy, not a terrain-aware defensive gateway policy.

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
