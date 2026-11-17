# Desired-state construction reconciliation (ED-27)

ED-27 is In Progress. This feature consumes retained plans independently of layout search. It must not delete plan entries after a structure/site appears; retained desired state is needed to rebuild losses. No site execution or runtime registration is implemented yet.

## Legacy reference

Read-only Eldrift-Directive baseline f2bbf7e8c44addc7c426abb5458e393c9502ff5f, utilV2.js around3180-3232: skip built placements, count existing sites, wait for entry RCL/source-container policy and structure capacity, issue at most one site, stop on ERR_FULL, then replace Memory.build with leftovers. Road/container helpers around2605-2623 issue direct construction calls. These behaviors inform the new boundary; the destructive leftovers model will be replaced by retained desired state. No legacy source was copied in this increment.

## Implemented boundary

features/construction/model.ts defines a snapshot port with room RCL, usable stored energy, terrain/fixed objects, observed structures/sites, completed dependency keys, temporary occupancy, RCL limits and independent global/room site budgets.

constructionEligibility is pure read-only classification: built, site-existing, eligible, waiting-for-RCL, waiting-for-budget, temporarily-blocked or invalid, each with an explicit reason. Existing owned objects are recognized before budget/stage checks. Static illegal terrain is invalid; obstruction/dependency states can be revisited. Energy reserve is compared against persisted minimumStoredEnergy at classification time. Structure/site counts deduplicate physical IDs. Shared placement rules are reused; native compatibility remains to be qualified.

Tests cover exact RCL/reserve boundaries, existing-object precedence under downgrade/exhaustion, invalid placements/metadata, occupancy/dependency waits, independent site caps and duplicate observations. Quality passed486production/437testfiles with zero Lizard violations. Focused classifier plus smoke:5tests in219ms. This is unit evidence, not native site creation or end-to-end reserve enforcement.

## Remaining work

1. Prepare/validate snapshots and index inventory once per cycle; avoid per-entry room scans at scale. Define usable reserve and neutral/hostile structure ownership explicitly.
2. Merge automatic/manual entries by stable placement key with manual precedence; order bootstrap, extraction/delivery, capacity, defense and later infrastructure. Preserve dependencies and remote policy.
3. Add a bounded executor with injected site port, in-cycle capacity reservations, current-state rechecks, explicit result mapping and retries/backoff. Do not issue destructive migration actions.
4. Register native configuration/observation adapters; retain all committed entries and bootstrap anchor across resets, RCL changes and structure loss. Enforce RCL plus reserve immediately before each site call.
5. Add actual-engine cases for existing sites, caps, RCL unlock/downgrade, reserve loss/missing storage, rebuilding and resets. Finalize ED-22 role reconciliation prerequisite before ED-27 acceptance closes.

The full rewrite remains active; this classifier does not satisfy the remaining construction acceptance criteria.


## Indexed cycle observations

`createConstructionClassifier` prepares one detached, validated observation per cycle and reuses position/type indexes for each entry. Economy, terrain, site-budget and RCL-limit shape checks run before classification. Physical IDs deduplicate counts; contradictory duplicate IDs reject instead of silently choosing an observation. Completed/temporary occupancy sets are detached too. The original one-entry function remains a convenience wrapper; the executor must use the cycle factory and refresh after state changes or successful reservations.

Existing-object checks use indexed positions; type/site budgets use precomputed counts. Terrain fixed-object validation still uses the small fixed-object list; this is not a complete per-cycle execution-time bound. Input ownership semantics for neutral roads/containers and native reserve observation remain adapter work.

Validation: quality487production/437testfiles, zero Lizard violations. Classifier snapshot/capacity plus smoke7tests passed256ms. Tests mutate source inventories, reserve and dependency sets after preparation, verify retained answers, and reject invalid budgets/RCL limits/conflicting identities. No new native scenario or full-unit claim for this increment. No construction site calls are registered.


## Entry merging and ordering

`mergeConstructionEntries` validates and detaches entries, deduplicates by type/x/y, and gives operator metadata precedence over generated metadata in either input order. Exact duplicates collapse; contradictory same-source duplicates reject as ambiguous rather than silently discarding reserve/dependency/RCL policy. Stable property ordering and sorted dependency references define duplicate equivalence. The merged graph must have valid internal references and no cycles.

`orderConstructionEntries` accepts an explicit type order and committed bootstrap spawn key. Defaults put bootstrap first, then containers/roads/storage, extensions, towers/defenses, and later infrastructure. Per-entry numeric priority applies within each category; placement keys give deterministic ties. This is ordering, not eligibility: RCL/dependencies/reserves still gate execution. Manual placement precedence does not mean every operator entry runs before bootstrap. Remote room authorization/roads/containers remain a separate policy to implement.

Quality passed489production/438testfiles with zero Lizard violations. Merge/order/classifier plus smoke:10tests230ms. Tests cover both input orders, detached original metadata, ambiguous duplicates, missing/cyclic dependencies, bootstrap/category order and deterministic reversed inputs. No sites or destructive actions are issued; executor/reservations/native adapters remain open.


## Bounded executor and local reservations

`runConstructionCycle` composes retained-entry merge/order, fresh observed eligibility and an injected site-creation port. Explicit entry and attempt caps plus admission checks bound each call. The latest snapshot is classified before each attempted site, including RCL, dependencies, reserve and capacity. Created requests reserve type/room/global capacity even when the engine has not exposed the sites yet; observations already containing the placement do not count it twice. The observation port must supply consistent room/global state.

Only accepted requests reserve slots. Full/not-owned results stop a cycle; other explicit results are reported within the attempt cap. Port inputs and returned decisions are detached; committed entries remain untouched. A returned cursor resumes bounded scans beyond completed prefixes and wraps so lost structures can be revisited. Callers must persist/bind this cursor to plan identity; that lifecycle is not implemented yet.

Reservations are currently local to one room cycle. Cross-room/global intent accounting, native result mapping, retries/backoff, remote authorization and atomic current-plan revision checks remain to be implemented before registration. There is no native createConstructionSite call or gameplay deployment in this increment.

Quality491production/439testfiles, zero Lizard violations. Full units1,053tests/307files passed8.34s. Executor tests cover accepted intent visibility lag, reflected-site deduplication, reserve loss/downgrade before issuance, full/admission/attempt limits, nonmutated plans and cursor fairness. This is mocked port behavior, not engine site-creation evidence.


## Shared tick reservation ledger

`createConstructionReservationLedger` tracks accepted room/type/x/y requests across room cycles. `reservedConstructionPorts` records only successful creates and projects missing intents into room sites and global counts. All room executors must share the ledger and an authoritative set of observed global placement keys. Global count comes from that key set plus accepted requests not reflected there; local executor reservations recognize projected placements and do not duplicate them.

Tick advancement clears old intent reservations in favor of actual observations; backwards/invalid ticks reject. Reflected sites are not added twice, and observed completed structures retire local accepted reservations. Creation inputs and ledger metadata are detached even if an injected adapter mutates its argument.

Quality492production/440testfiles, zero Lizard violations. Shared-ledger/executor plus smoke9tests225ms. Cross-room cap exhaustion, reflected-site count, tick turnover, failed-request nonreservation and adapter mutation isolation covered. Native global-site observation and runtime ledger ownership still need wiring; no new native execution evidence is claimed. Cursor/retry persistence and remote policy remain open.


## Native construction port and first engine evidence

Native construction composition lives in app/native-construction-ports.ts, following the app-layer native planning pattern; adapters do not import feature contracts. It composes room assessment/limits with owned site observations, completed structure keys, hostile-creep occupancy and global owned-site placement keys. Neutral roads/containers in an owned room are usable/completed infrastructure; hostile owned-structure types are not. Default reserve is owned storage energy; terminal energy is an explicit opt-in. Missing/nonowned storage contributes zero.

Site requests recheck visible room ownership and map native acceptance/full/RCL/ownership/argument errors explicitly. Invalid-target/other errors remain retryable for future bounded backoff, since dynamic occupancy can cause them. Native reserve/site eligibility is still enforced by the executor before this mechanism call.

New registered --construction local-engine scenario passed6ticks: one accepted road, observed site on later ticks, room cap prevents another road, and missing storage blocks the50000reserve rampart. Evidence docs/evidence/construction-native-baseline.json retains dirty-worktree/bundle provenance and all decision rows. No errors/messages. This is test-bot integration, not normal runtime registration or live deployment. Existing full-suite170case report predates this newly registered case; no171case aggregate is claimed.

Quality493production/442testfiles zero Lizard violations. Native-port/executor plus smoke8tests passed241ms, covering storage/optional terminal reserve sources, neutral/hostile classification, global identities, ownership loss and result mapping. Cursor/retry persistence, normal runtime feature/configuration, plan-revision guard, remote authorization and rebuilding/RCL/reset engine scenarios remain open.


## Plan-bound persisted cursor

Construction owns a version1 progress namespace per room with compare-and-save revision, exact plan/order identity and next scan index. createStoredConstructionCycle resumes that index after recreation and starts at0when desired plan contents/revision or ordering policy changes. Admission refusal touches neither plan nor store. Every side-effect request rechecks current desired-plan identity and progress revision; if either changed, later site calls stop and stale progress is not saved. Already accepted intents cannot be undone by a later revision change.

The native --construction fixture now recreates store/service every tick, uses a fixture-defined retained plan and scans one entry per call. It passed6ticks with cursor1/2/0/1/2/0, progress revision6, exactly1road, site-existing recognition, cap refusal and missing-storage reserve refusal. Evidence construction-stored-native.json retains dirty/bundle provenance. This proves native Memory/service recreation, not whole-module reset or normal committed-plan runtime registration.

Quality495production/443testfiles, zero Lizard violations. Focused stored-cycle/executor plus smoke8tests249ms. Full units1,060tests/310files passed8.42s. Tests cover refusal without initialization, recreated cursor, plan revision restart, stale plan blocking and stale progress-save rejection. Persistent bounded retry/quarantine records, runtime configuration/feature registration, remote authorization and remaining engine lifecycle cases are still open.
