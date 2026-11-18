# Native scout control (ED-28)

Current runtime scope includes native scout control/demand, shared risk-aware movement, observer scheduling/capture (see observers.md), and the typed flag fallback below. Clean188-case observer/scout qualification is archived; the final fallback-source189-case run is pending. Public console/legacy-memory adapters remain ED-39/44 and pressure/soak ED-43. Earlier milestone sections retain their historical scope and failed evidence.

Status: native control, recruitment and fallback exploration are implemented in tested increments. Scout/observer acceptance is not complete: observer actions/delayed visibility, operator flag adapters, migration and release pressure/soak qualification remain open.

## Responsibilities and ownership

The scout-control feature owns objectives, assigned-list progress, room-entry stabilization/visits, temporary exclusions and observed progress. It composes core/execution/execute with bounded choose/stabilize/travel/evade handlers; execution fields are passed explicitly so generic checkpoint merging cannot overwrite handler-owned objective/visit state. Four phase evaluations per call bound same-tick work. Repeated invocation at the same persisted tick emits no additional action.

scout-control/empire contains at most512validated controls keyed by native ID. Home demand identity remains separate from current room. Configured list changes reset its progress; exhausted lists use freshness-aware exploration. Native observation captures current-room facts even at a border, but only an interior, stabilized visit advances lastVisit. Danger interrupts idle/retry sleep, captures observation without inventing a stabilized visit, and selects a permitted adjacent escape. Unknown, hostile and stale decisions use the shared traversal policy; a dangerous origin can be left explicitly without exempting destinations from admission.

Stuck observation and rapid room reversals trigger bounded replanning; route failure advances the assigned objective and temporarily excludes the failed room. Stabilization/escape failures rotate their candidate/exit selection. Fatigue and CPU/read-admission deferral do not consume route-failure retries. Unit errors are reported and checkpointed for fair retry; a failed unit or reporting sink does not monopolize the next limited slot. Oldest persisted lastTick wins within a room, including after reset. Corrupt/unwritable state is preserved rather than silently reinitialized.

Native heartbeat/loss history remains in scouting/empire. The ordinary complete-creep retirement boundary removes dead scout controls after replay-safe loss reporting. Name reuse cannot retain old-ID controls. No runtime code calls private scout moveTo or native move directly: all movement uses the existing application dispatch, action arbiter, observed progress, path service and traffic flush.

## Shared movement additions

RoutePolicy.allowedRooms is an optional explicit corridor. The common room router excludes out-of-corridor destinations/costs and rejects a finder result that escapes it. Native scout routing first assesses the route through current map status, retained intel, diplomacy and temporary/repeated-loss exclusions, then supplies its accepted corridor to ordinary movement. The route and cost data determine a stable policy version; arbitrary tick changes do not invalidate unchanged paths.

Command-specific avoid tiles are detached overlays on cloned shared matrix snapshots. They affect topology/cache identity, retain existing obstacles, and never contaminate another mover's base matrix. Threat zones use clipped Chebyshev radii and leave the current tile escapable. The common structure walkability rule preserves private foreign rampart blocking, correcting the old scout matrix's blanket rampart exemption. Goal selection for stabilization is separate from actual pathfinding, and failed goals can rotate.

## Recruitment and configuration

Population ownership is scout:<home>, using the shared demand/queue/body/dispatch machinery and the legacy single-MOVE recipe from spawner.js666–668. Recruitment defaults to RCL2 or later, matching shouldSpawnExplorationScout. The desired effective fleet target follows ordinary replacement timing, including permitted overlap near expiry; it is not a universal hard count of all living scouts. Explicit disablement cancels only this owner’s queued requests. Expired own requests are removed even when planning is paused. Incomplete assessments retain valid existing demand instead of treating unseen rooms as empty; known hostile assigned destinations do not create demand.

The controller runs for visible rooms containing its owned scouts, even if those rooms are foreign or home is not visible. Home configuration is looked up through injected composition. Spawning remains owned-home work. Both activation flags default false.

| Concern | Defaults / controls |
| --- | --- |
| Activation | scoutsEnabled=false, scoutSpawningEnabled=false, scoutCount=1, scoutMinimumRcl=2 |
| Explicit objectives | scoutAssignedRooms=[]; ordered list, maximum64 canonical rooms |
| Exploration maturity | scoutDepth=2, scoutExtendedDepth=4, scoutExtendedProgress=0.1 at RCL3; RCL4+ uses extended depth |
| Discovery bounds | scoutExplorationReads=32, scoutExplorationRooms=32, scoutDemandInterval=10 |
| CPU admission | scoutPlanCpuBudget=3 shared by recruitment and all fallback consumers for one home/tick; scoutControlCpuBudget=5 per current-room execution batch |
| Entry and recovery | scoutStabilizeTicks=1, scoutStuckTicks=3, scoutOscillationLimit=2 |
| Threats and routes | scoutThreatRange=5, scoutAllowKeeper=true with penalty, scoutMaximumRouteRooms=16 |
| Exclusion timing | scoutHostileAvoidTicks=1500, scoutRouteAvoidTicks=1000, scoutDangerWindow=5000, scoutDangerLosses=2 |

These are validated normal configuration layers, including room overrides. Discovery also honors backgroundEnabled, minimumBucket and backgroundCpuFraction. CPU guards are cooperative admission, not hard elapsed ceilings for an atomic room snapshot/path query. A zero control budget pauses unit control; a zero planning allowance pauses new discovery/assessment without cancelling standing valid demand. Disable spawning explicitly to cancel its requests. Danger/current-target movement is urgent execution, independent of optional discovery.

Extended depth uses controller progress fraction rather than the legacy literal135000 total, retaining the current10% threshold while allowing future totals. Assigned physical-visit requests and automatic freshness-based exploration remain distinct: fresh observer/capture facts suppress automatic travel, while explicit room objectives can still request a physical visit. Legacy assigned-flag fallback and legacy creep-memory import remain ED-39/44 adapter work, not silently supported behavior.

## Evidence and remaining scope

New packaged scenarios are --scout-control (entry/visit/reload/static-hostile escape), --scout-spawn (real queue recruitment, early loss and replacement finishing the pending visit), --scout-default (control/evasion at default CPU budgets), --scout-explore (no assigned list, ordinary recruitment and fresh-frontier progression at default depth/budgets), and --scout-blocked (private foreign rampart blocks the first room; another assigned visit completes after reset). Each verifier requires zero reported unit errors and retains a one-time unrelated-state witness. The population tests assert the cap for their particular scenario, not arbitrary lifetime replacement pressure.

During development the unassigned case exposed a fixture defect: the pinned native finder loads neighboring terrain before invoking roomCallback to reject it (driver/native/src/pf.cc room_index_from_pos). A sparse fixture therefore threw even outside the allowed corridor. The corrected fixture supplies a terrain halo, retains the failed evidence, and checks reported messages instead of accepting a caught error loop as progress. This changes test data, not production error classification.

Final-source targeted --scout-explore passes110ticks with default3CPU shared discovery, default5CPU control and default depth2 at RCL2: E0N1 is physically visited at49, later fresh frontiers are selected, W0N2 is visited at105 and W1N1 at110, with no reported errors. The next objective is another depth2 frontier. Other targeted functional increments and the terrain diagnostic are archived in docs/evidence/scout-runtime-native.json with exact dirty/bundle/engine provenance. The full native suite now registers187cases; clean final-source aggregate qualification follows.

Latest full units1,210tests/339files pass9.35s. Quality550production/483testfiles passes with zero Lizard violations. check:bundle passes, including CommonJS execution without Node globals. Whole-fixture samples include probe rows/cold start and are not ED-43 performance/soak proof.

Remaining ED-28 work includes observer action ownership, delayed observation/refresh demand and vision budgeting, further scout/operator integration where the acceptance audit identifies gaps, plus current-source full native qualification. ED-39/44 own external flag/API and memory translation; ED-43 retains larger pressure, CPU/Memory and soak validation. No whole-role release parity or goal completion is claimed here.

### Default-budget regression correction

The clean1a539c2 aggregate passed all five scout cases but failed at --stamp-budget: composition and defense completed, with service scoring still advancing at tick1600. No runtime errors were reported. The failed trace and exact provenance are retained in docs/evidence/scout-runtime-stamp-budget-failure.json; this run is not a passing187-case qualification.

Native score preparation now owns a single-network search cache. Identical final tile costs reuse the private base CostMatrix across resumed scoring ticks; each actual search still clones it before road/blocker overlays. Changed costs rebuild the base, malformed changes still fail validation, and cache eviction/reset only repeats preparation. This removes repeated2500-cell native matrix construction without changing planner budgets, identities, persisted schemas, search semantics or scenario limits. Unit tests cover matrix construction counts, overlay isolation, changed-cost invalidation, invalid inputs and independent owners.

Targeted --stamp-budget passed, committing at tick1219, with36 evaluated/35 rejected candidates and reloads6/101. docs/evidence/planning-native-search-cache.json preserves its dirty development provenance; elapsed completion differences also include machine/JIT variability and are not an isolated benchmark. Full units1212tests/340files passed9.47s; quality551production/484testfiles passed with zero violations; bundle check passed. Clean aggregate qualification remains pending.


The subsequent cleanfa5dd11 aggregate also failed at --stamp-budget after all five scout cases passed. Unlike the first failure, it remained in defense with all three generated results retained (372barriers). Matrix reuse alone was insufficient. docs/evidence/planning-defense-transport-failure.json retains the second clean failure. Repeated reflective copies of the generated geometry through generic checkpoint layers could consume admission before the next coordinator step.

The defense owner now emits a version2 bounded JSON payload. Generic layers transport opaque text; the coordinator decodes/validates restored geometry and re-evaluates candidates after cache loss. Exact saved-state comparison still detects rollback/changed checkpoints. Version1 object checkpoints upgrade on their next save; semantic candidate identities remain unchanged. Tests cover legacy upgrade, reset/rollback convergence, malformed JSON, invalid generated order/positions and unsupported versions. The diagnostic probe decodes both formats to retain the same five-phase reset assertions.

Targeted default-budget and five-phase-reset runs now commit at1419/1283 respectively, with equal final plans and36evaluated/35rejected candidates. Their dirty provenance is retained in docs/evidence/planning-defense-transport-native.json. Full units1214tests/340files pass9.63s; quality552production/484testfiles and bundle checks pass. Tick limits/CPU allowances remain unchanged. Clean aggregate requalification and ED-43 pressure/soak are still required; opaque encoding can increase serialized escaping overhead and is not a memory-footprint optimization.


### Clean combined qualification

All187packaged native engine checks pass in694.37s on clean6380e92, with the same commit/clean provenance verified in every case. docs/evidence/scout-runtime-engine-suite.json archives the aggregate, while docs/evidence/scout-runtime-clean-native.json preserves complete evidence for the six scout lifecycle/control/demand cases. Expected injected error/timeout cases retain their expected-failure classification. Default-budget planning commits at1493 and the five-phase-reset run at1315 with equal plans. Earlier failed clean runs remain retained; the1493 result still demonstrates sensitivity near the1600-tick gate, so ED-43 repeated pressure/CPU/soak qualification remains open.

This establishes the described native scout increment, not observer functionality, legacy flag/memory integration or whole-goal completion. The next implementation increment is the separate observer action/receipt/capture owner.


## Typed assigned-flag fallback

Legacy role.scout.js676–683 selected the first flag whose name contained creep.memory.assignedFlag and called moveTo when objective/route processing could not progress. ScoutControlPorts now exposes an optional fallback(avoidUntil) outcome port. The controller calls it only without an admissible objective; normal assigned/exploration work and danger evasion take priority. Arrival is a running hold with moving=false, so waiting at a flag does not create false stuck/retry failures. The same-tick checkpoint gate still prevents repeated actions.

scoutFallbackFlag defaults to an empty, disabled selector and follows normal room/profile/temporary layers. It accepts a nonblank string up to100characters. The native flag adapter retains substring matching, uses stable name order for multiple matches, caches plain positions only for the current tick, and returns detached goals. Flag moves/removals become new goals on the next tick. No native flag object or mission state enters the reusable controller.

The native goal uses the same scout movement helper as ordinary travel, with range1 at the flag position, live traversal/risk admission, explicit room corridor, threat overlay, path revision, traffic and single dispatch owner. No additional moveTo/PathFinder stack is introduced. A safe matched room can contribute bounded population demand even when ordinary exploration depth is zero; missing or newly hostile goals do not keep recruiting. The existing population coordinator owns actual bodies/queue/replacement.

Deliberate corrections: the selector is explicit and empty means disabled; ambiguous matches are deterministic rather than object-enumeration dependent; dangerous rooms/operator flags cannot bypass traversal policy. On failed routes the controller first records the failure/exclusion and releases the objective, then may use fallback on the next admissible tick after replanning. It does not issue a second movement command in the failure tick. Public per-creep assignedFlag compatibility, Game/console commands and legacy-memory translation remain ED-39/44; those adapters supply the existing typed goal boundary.

Focused checks cover detached matching, moved/removed targets, absence, objective/danger priority, same-tick deduplication, arrival holds through reset, failure-to-fallback recovery, configuration validation, real demand and hostile-target cancellation without touching other owners. Final targeted --scout-fallback passes140native ticks at ordinary3CPU planning/5CPU control with zero exploration depth: real spawning, initial goal, moved goal, removed-match replacement, final disappearance, resets12/60/110, stable one-unit demand, physical visit stabilization and unchanged unrelated witness. No errors/messages occur. docs/evidence/scout-fallback-native.json retains complete dirty provenance and the earlier successful but tightly timed development fixture.

Quality564production/491testfiles passes with zero Lizard violations. Full units1238tests/345files pass9.00s; bundle check passes. This completes the implemented ED-28 runtime paths subject to clean combined189-case qualification and the acceptance audit; it is not a release/whole-goal completion claim.


## Final ED-28 audit

All189packaged native checks pass717.88s on clean8fef163, with per-case clean provenance/status/digests verified. The four ED-28 runtime criteria and source integration scope are audited in ed28-acceptance.md; full report ed28-engine-suite.json and complete clean fallback evidence are under docs/evidence. Default/late-reset stamp planning commits1207/1297 with equal plans. The runtime acceptance audit is supported; public adapters, specialist/remote missions and release/performance gates remain their planned ED issues. The whole rewrite goal remains active.
