# Remote infrastructure ownership

ED-29 remains in progress. An explicit Outpost demand now drives feature-owned route planning and construction execution. Automatic portfolio/recruitment/main-loop registration and public control translation remain pending; this is not complete remote mining acceptance.

## Porting reference and deliberate corrections

Read-only baseline f2bbf7e8c44addc7c426abb5458e393c9502ff5f: utilV2.buildRoadsFromPath (2591) emits visible-room road sites and a retained endpoint container, skipping mineral paths and stopping beyond approximately 80 global sites. Active consumers include role.minerV2 (335), role.courierV3 (225), and jobs (980/1513/1694); consoleCommands registers Game.buildRoadsFromPath and Game.buildRemoteRoads (711/712). The periodic controller.buildRemoteRoads call at 1205 is commented out. Preserve the operator entrypoints under ED-39/44; do not classify their absence from automatic scheduling as dead code.

The rewrite separates path acquisition, pure compilation, feature-owned persistence, current authority and shared construction. Road/container flags are independent. Source endpoints use legal adjacent mining access; a legacy container within two tiles is not sufficient to establish an adjacent harvesting station. Border crossings remain in route continuity checks but border road entries are omitted under the existing shared construction placement policy. Fixed-object, capacity, terrain, site conflict and retry decisions remain with shared construction rather than being copied into remote policy.

## Planning and persistence

Native planning uses the owned home anchor, current source/station observation, an admitted known-safe corridor and shared live/retained static matrices. Maximum path operations and source searches are explicit. A source is added only after a complete path reaches its exact adjacent station. Partial source routes survive global reset in a revision/generation/topology-fenced draft; incomplete paths never become partial desired construction. Roads deduplicate across source paths. Only a complete draft compiles room plans and station coordinates.

The stable namespace is scoped by home and target. Revision checks reject stale writers; current assignment resolution rejects revoked/expired generations or changed source membership. A new draft clears old desired state until it is complete. This state is separate from owned-room layout plans. Records are bounded to 16 sources, 64 rooms and 10,000 entries; routes are bounded to 3,200 steps each. Large-policy capacity and full production pressure qualification remain acceptance work.

## Construction

Execution reuses stored construction scans/retries and an injected shared tick ledger. Owned and remote native factories can receive the same ledger. Remote cursors use a separate construction identity while retaining the real room in their record. Total entry and attempt budgets span all rooms in a run; a clock-based rotation prevents a small room budget always preferring the first room.

Before each effect, execution rechecks lease generation, desired-state revision, admission and the caller CPU guard. Native admission requires an owned home, visible neutral/self-reserved remote, safe admitted route and current visibility of the construction room. Another owned room on a corridor retains its own layout owner. Revocation stops new sites; it does not demolish accepted sites or release unrelated owners' state.

## Qualification scope

The 50-tick real-engine probe uses two actual sources and native pathfinding. One-source planning slices survive resets between sources, construction pauses during hostile pressure and resumes safely, stale lease tokens cannot plan or construct after revocation, and a new container-only generation creates two actual container sites. Later expiry prevents new sites even after the fixture removes prior sites. Six global resets occur at ticks 2/4/13/22/28/42. Owned plan and construction progress sentinels must remain byte-equivalent in every row.

Fixture site removals at ticks 6/20/26/40 deliberately create pending work; these are not evidence of builder completion. The probe establishes site admission/lifecycle, not worker build throughput, automatic remote orchestration, CPU/Memory pressure or soak results. The initial engine-gDxS10 fixture omitted the standard operator/config initialization and failed the common harness precondition, with no bot error; the fixture was corrected. Clean committed e31ef83 passes all six targeted entrypoints: remote infrastructure, remote construction, construction runtime, construction retry, remote assessment and remote mining. Full units: 1,318 tests / 361 files in 9.34 seconds; focused: 14 tests / 5 files in 320 ms. Type checking, lint, boundaries and packaged bundle pass; Lizard reports 616 production / 518 test files and zero violations. Exact per-run provenance, hashes and native samples are archived in evidence/remote-infrastructure-native.json, with a lossless 50-row archive. The new case is registered as case 201; the full 201-case suite has not been rerun. The preceding full clean 200-case qualification is remote-transport-engine-suite.json. Shared defaults remain unchanged and affected construction/assessment/mining entrypoints were rerun for this increment.
