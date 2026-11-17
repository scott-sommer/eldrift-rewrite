# Defensive planning implementation record

ED-26 is In Progress. Current production baseline: 9a6d263 (2026-11-18).
Full unit regression: 1,036 tests/303 files passed in8.31s.
Latest quality:483 production/435 test files, zero Lizard violations.
Adaptive native policy is active when planning is enabled; planning defaults off.
Search replay, candidate/coordinator recovery, explicit asset accounting, road gates
and persisted energy-reserve requirements are implemented. Engine evidence proves
selected native completion/reset paths, not strict CPU compliance or all acceptance
fixtures. Chronological implementation evidence follows below.

## Provenance and scope

Read-only legacy baseline f2bbf7e8c44addc7c426abb5458e393c9502ff5f:
room.rampart.strategy.terrainAwareCore.js and exitPerimeter.js are placeholders
(canPlanRamparts false, count Infinity, apply returns unchanged plan).
perimeterWithController.js is implemented and its port remains the production
fallback in legacy-perimeter-defense.ts. Legacy selection compared barrier count
with declaration-order ties. New generation and operational policy are enhancements.

The residual solver and vertex-split reduction are original implementations of
standard Edmonds-Karp and weighted vertex-cut algorithms. No third-party solver
source or package was copied or introduced. Engine mechanics were checked against
the pinned local @screeps/engine4.3.2 and common constants, plus the official
[Screeps API](https://docs.screeps.com/api/). Nominal tower power excludes power
effects and energy availability; caller policy supplies those assumptions.

## Responsibility boundaries

- defense-separation: explicit attacker entry cells and protected assets; eight-way
  flood reachability with intact barriers. Default entry discovery includes every
  open border cell. This is static separation, not combat survival.
- barrier-cost: shared terrain/object placement, constraints, separation and tile
  inventory cost. Explicit empty entry regions mean no modeled attackers.
- exit-perimeter-defense: deterministic inset room envelope with natural walls
  replacing cells; caller supplies construction RCL. Shared validation can reject it.
- residual-network: heap-owned residual flow with bounded augmentations per call.
- terrain-cut-network: split each walkable tile into input/output nodes, legal
  barrier cost on the connecting edge, high capacity on movement/terminal edges.
  Eight-way movement preserves diagonal threat paths. Infinity is sum(costs)+1.
  Terminal cells cannot be cut. A flow reaching infinity means no legal cut.
- terrain-cut-defense: derive legal rampart cells, forbid clearance constraints,
  produce staged barriers and run shared separation validation. Protected interior
  tiles and protected asset placements are separate inputs.
- defense-access: flood friendly movement from explicit origins, then dilate the
  reachable worker cells by repair range, including blocked repair targets.
- defense-operations: nominal upkeep energy/tick, inaccessible repair targets,
  blocked gates and summed tower coverage/undercoverage diagnostics.
- defense-candidate: compose placement, separation, walkability, access and
  operational measurements. It does not choose a strategy or create sites.
- defense-selection: weighted dimensions, hard access tolerances, stable ID ties.

## Evidence and limits

Unit fixtures cover diagonal leaks, disconnected exits/chambers, barrier-covered
assets, illegal placement and clearance, blocked friendly gates, repair ranges,
nominal tower falloff, operational ranking, vertex-cut input/output isolation,
parallel flow edges, incremental augmentation and uncuttable terminal paths.
A two-route weighted diagonal fixture compares the cut with exhaustive subsets
using independent flood separation, establishing optimum5 for that fixture.

Native --layout-placement engine-xQ3KtV passed after shared validation integration,
with no errors/messages. This qualifies existing layout compatibility only.
Later entries below record native room-scale generation and adaptive production
selection evidence; these supersede this initial compatibility-only baseline.

## Remaining execution plan

1. Finish requalification of stamp/automatic/irregular/default-budget/late-reset
   native fixtures after adaptive policy activation; compare completed plans and
   retain exact bundle provenance. Full engine regression remains required.
2. Add explicit native open-exit/choke/controller/disconnected/fallback acceptance
   cases with strategy identity and protection/operational reports.
3. Measure and resolve atomic setup/finalization CPU costs; current admission and
   scan allowances do not establish a strict CPU ceiling. Profile Memory overhead.
4. Enforce persisted RCL/energy requirements in ED-27 construction execution and
   verify reserve-loss/missing-storage behavior; metadata alone is not enforcement.
5. Audit operator barriers/locks and retained-plan safety across policy revisions.
6. Record acceptance evidence against each ED-26 criterion and close only when
   all requirements pass. ED-43 owns broader performance and soak gates.

No new generator creates construction sites; construction reconciliation remains
a separate feature. No claim of ED-26 completion follows from the current unit suite.

## Search scan budgeting

Residual BFS retains a heap iterator and accepts an explicit scan allowance;
terrain-cut-network and terrain-cut-defense forward it as the third advance
argument. Zero scans or a false CPU guard leave search pending. A tiny-slice
adapter regression compares the complete validated staged defense with an
uninterrupted run. Counts include iterator completion steps. This bounds BFS
advancement only: graph construction, path augmentation and final validation
still include synchronous work. Heap iterators are not persistence checkpoints.
Integrated milestone: real terrain-cut, exit-perimeter and legacy generators now run through shared evaluation/ranking in defense-pipeline.test.ts. The corridor fixture completes all three with valid separation and selects a minimum-cost one-barrier envelope. Full1001 unit tests/291 files passed7.68s; quality467 production/422 test files passed. This remains a local unit integration fixture; native production selection and reset-safe persistence are pending.
Open-room local measurement (Node24.22.1, Windows, production273ec6f): 50x50 plain room,11x11 protected interior, all border entries. Setup16.13ms;2062 calls at1 augmentation/1000 scans; summed search102.84ms; maximum observed slice4.42ms;48 barriers passed shared validation. Reproduce with node tools/measure-defense-cut.mjs. These are local Node wall timings, not Screeps CPU. Graph construction remains synchronous and is the next budgeting target. Evidence: evidence/defense-cut-local.json.


## Deferred setup measurement

After bounded legal-grid, terrain-edge and residual-edge construction changes,
clean a30307d repeats the same open-room fixture: constructor1.12ms,
2109 advance calls, summed advance120.24ms, largest slice4.85ms at the final
completion/validation call. The first advance took2.86ms; other large samples
include residual-construction transition calls. Cut remains48 barriers and passes
shared validation. Evidence: evidence/defense-cut-sliced-local.json.
Constructor-only reduction from16.13ms reflects work moved into advance calls;
it is not a reduction in total computation or a controlled statistical benchmark.
These are local Node wall times, not Screeps CPU.

Full1003 unit tests/291 files passed7.43s on this revision.
Next qualification must measure real-engine CPU across preparation, graph transfer,
search and final validation. The last phase is still atomic. Persistent recovery
must preserve or deterministically rebuild pending construction/search state;
heap iterators alone do not meet the reset criterion. Common strategy adapters and
coordinator exist, but native planning still uses legacy defense policy.
Native open-room synthetic-observation cut scenario --defense-cut passed engine-uMxRAd:251 planner calls, completion tick251,48 validated barriers, no runtime errors/messages. Planner CPU sum548.13ms, maximum5.449ms, final5.168ms with cooperative5ms guard and10000 scans/1 augmentation. Evidence: evidence/defense-cut-native.json. Scenario runs alongside main runtime but uses authored plain observation rather than live room assessment; no reset or production defensive-selection claim. Registered in full engine suite for future regression.
Native restart baseline --defense-cut-reload passed engine-UM9kHi: module reloads101/201, search starts1/101/201, final completion451,48 barriers. Planner CPU sum1078.06ms versus548.13ms in prior no-reload run (indicative separate runs). Evidence: evidence/defense-cut-reload-native.json. This proves eventual reconstruction after heap loss, not persisted search continuation. It quantifies lost progress and leaves the ED-26 persistent recovery requirement open.
Native checkpoint-recovery fixture engine-MMOjQP passed with reloads101/201 restoring augmentation targets18/18. Completion452,48 barriers,no errors; planner CPU sum1167.87ms; exact graph checkpoint362511 JSON bytes. Evidence: evidence/defense-cut-recovered-native.json. Compact edge triples replace object-shaped signature (recoverable-flow-v2 rejects prior identities). Recovery reconstructs rather than trusts residual state, but repeats substantial work and uses large Memory; it is not yet production-qualified. Partial replay at the second reload retained the original target, without falsely claiming new progress.
Native exact-plan comparison passed: engine-GZc6y1 uninterrupted vs engine-Tps9tJ reload-restored produce identical staged barrier entries (geometry/type/RCL/priority/tag). Both have no errors/messages. Evidence: evidence/defense-cut-plan-comparison.json. The engine suite now asserts this exact comparison rather than counts alone. This remains synthetic-observation qualification; production defensive selection is not wired.
Request-owner native fixture engine-bXJy6a passes module reloads101/201 through TerrainDefenseCheckpoint rather than raw FlowCheckpoint. Whole-request identity and last flow progress survive Memory round trips; evidence evidence/defense-request-native.json. This does not yet establish production namespace/coordinator integration or efficient replay.
Native versioned-store qualification engine-t6DRdE passes --defense-cut-reload using defense-search/W0N1 owner/version1 with revision-checked writes. Fixture no longer owns raw checkpoint persistence. Evidence: evidence/defense-store-native.json. Main gameplay defensive policy/coordinator still needs integration; replay remains costly.
Stored lifecycle native fixture engine-XFWCFC passes reload recovery through createStoredTerrainDefense; duplicated fixture save/advance code removed. Evidence: evidence/defense-service-native.json. Main gameplay composition still uses legacy defense; this is the intended reusable service boundary under real engine execution.


### Stored request policy changes

The stored terrain-defense lifecycle compares the current request identity before restoring saved progress. A changed request clears only the defense-search checkpoint through a revision-checked write and reports `restarted`; the next admitted advance starts fresh. Admission refusal performs no store access. Concurrent revision failure remains an explicit conflict. Committed planning state is outside this service's ownership.

Validation: quality gates passed (471 production files, 427 test files, zero Lizard violations); targeted recovery/store/request plus smoke tests passed (7 tests, 265 ms); full unit suite passed (1,014 tests across 295 files, 8.66 s). The native fixture handles the new restart status, but no new native-run evidence is claimed for this change. Production strategy/coordinator integration and ED-26's remaining fixture gates remain open.


### Durable search in the strategy pipeline

`createStoredDefenseStrategies` composes the persisted terrain-search lifecycle into the same strategy contract used by exit-perimeter and legacy fallback generation. The ordinary strategy factory accepts an explicitly injected terrain strategy; persistence stays at the feature composition boundary. Deferred admission, restart and revision conflict yield pending rather than rejecting an otherwise viable strategy. The caller must supply a stable request snapshot and room-specific store.

Tests exercise progress after adapter recreation, policy-change restart with new RCL staging, and both durable and heap-only generators through shared evaluation/ranking (all three candidates valid in the corridor fixture). Quality gates passed: 472 production files, 428 test files, zero Lizard violations. Targeted adapter/pipeline/coordinator plus smoke: seven tests passed in 286 ms. This does not persist coordinator evaluation progress or wire the strategy set into the live runtime; those remain necessary integration work. No new native engine claim is made.


### Resumable candidate defense boundary

Candidate evaluation now supports an explicit optional defense stage between draft generation and route scoring. The defense port owns an opaque checkpoint carried in the existing serialized candidate payload, supplies a semantic revision included in candidate identity, and returns pending/rejected/complete geometry. Admission refusal retains progress without invoking the port. Completion moves to scoring on a later call; no unscored proposal escapes. Existing callers without the port retain their previous lifecycle and semantic identity. The native evaluator exposes the port for composition; native policy still uses legacy synchronous defense until the coordinator adapter and policy inputs are connected.

Lizard identified excessive branching during implementation; candidate identity construction was extracted and phase validation consolidated. Final quality checks passed (473 production / 429 test files, zero violations). Focused candidate lifecycle plus smoke: 13 tests passed in 1.07 s. Full unit regression: 1,018 tests across 297 files passed in 9.12 s. Native engine and production policy integration remain unproven for the new phase.


### Coordinator geometry checkpoints

The coordinator exposes a detached versioned geometry checkpoint bound to ordered strategy IDs, plain evaluation inputs, ranking policy, and an explicit recovery revision (including movement semantics supplied by the caller). Restoration skips finished generators but revalidates their geometry under admission before ranking; persisted evaluation scores are not trusted. Progress validation checks order, result kinds and barrier positions. Pending terrain-generator work remains owned by its separate search checkpoint.

Restored coordinators must be retained across admitted calls while revalidation proceeds; reconstructing the coordinator every call would repeatedly replay validation. A candidate-defense composition adapter therefore still needs a request-scoped heap cache alongside its serialized checkpoint. The native policy remains legacy-only until that integration is completed.

Quality passed (474 production / 429 test files, zero Lizard violations). Coordinator/pipeline plus smoke: six tests passed in 287 ms, including restoration after generation, no repeated generator execution, detached checkpoint data and invalidation for policy/movement changes. No new full-suite or engine claim for this increment.


### Candidate-defense composition

`createCoordinatedCandidateDefense` implements the revisioned candidate-defense port with an injected strategy/evaluation/ranking setup and bounded search allowances. One request-scoped heap coordinator retains validation progress. Serialized candidate checkpoint state carries request identity and coordinator geometry; cache loss restores it, older checkpoints replace newer accelerators, and cross-candidate checkpoints fail explicitly. Deferred admission does not prepare strategies or touch search state. No eligible strategy rejects the candidate. Selected barriers merge into detached layout entries with duplicate type/position entries removed.

Tests use actual stored terrain, exit-perimeter and legacy fallback strategies in a corridor, reset the adapter at calls 1/3/6, and verify minimum-barrier convergence and original layout preservation. Additional tests cover refusal before setup, foreign request rejection, older-checkpoint rollback and no-valid-defense rejection. Final quality passed (475 production / 430 test files, zero Lizard violations); focused composition/lifecycle/coordinator plus smoke: 12 tests in 353 ms. Full unit regression: 1,025 tests across 298 files in 8.15 s.

Remaining integration: native planning policy/work must supply this port and retain it in the room-owned observation/policy cache, provide complete protection inventory and configured operational weights, and qualify the packaged native scenarios. The current native policy still applies the legacy perimeter during scoring; no production activation or new engine evidence is claimed here.


### Native work wiring and room cache

NativePlanningPolicy now accepts an optional revisioned defense factory. Native work forwards it to the candidate evaluator through a lazy admitted wrapper. The room-owned cache retains one defense port per observation/policy identity across work/evaluator recreation; callers without a shared room cache receive a work-scoped cache. The factory receives the state port and observation to compose stored strategies. Its returned revision must match the declared policy revision. That revision also participates in planning request/commit identity, so changing defense semantics invalidates old proposals and candidate checkpoints.

Tests verify native work reaches the defense phase without invoking score preparation, reuses its port across recreated work, rejects old progress after a defense revision change, defers setup under refusal, invalidates changed request caches and rejects mismatched factory revisions. Quality passed (477 production / 431 test files, zero Lizard violations). Focused native work/defense/cache plus smoke: ten tests in 594 ms. The default native policy still uses legacy perimeter scoring; complete protection/operational setup and packaged engine activation remain open. No new full-suite/native evidence is claimed.


### Complete request inventory and setup

`defenseAssetInventory` accounts for every planned entry, observed structure and fixed object. Valuable planned/owned observed structures require protection; distributed nonvaluable structures and source/mineral operations receive explicit exemption reasons. Controller position and every non-wall adjacent approach remain required. Protected tiles are deduplicated and existing valuable structures join the separation assets without duplicate type/position entries.

`prepareDefensePlan` composes that inventory into shared evaluation, terrain generation and legacy fallback inputs. It detaches plain request data, takes staging/costs/repair/tower semantics from injected policy, and selects traversable adjacent service origins using the same friendly occupancy mask as evaluation. Missing valuable assets or service origins fail explicitly. No construction is issued. Gates remain an explicit empty set here; production policy must supply meaningful gate requirements where applicable. Selection weights and economy policy are still external.

Quality passed (479 production / 432 test files, zero Lizard violations); inventory/setup/pipeline plus smoke: six tests passed in 300 ms. Covers complete accounting, controller approaches, observed assets, detached data and blocked service origins. No new full-suite or native evidence is claimed. Default policy activation and native fixtures remain open.


### Native adaptive policy activation

Native planning now defaults to the adaptive defense phase, composing complete inventory, stored terrain cut, exit perimeter and legacy fallback through shared evaluation/ranking. `planningDefenseStrategy=legacy` retains the previous synchronous profile. Planning itself remains disabled by default. Configurable staging, scan/augmentation allowances, upkeep/repair/tower weights, nominal tower threshold and repair-access tolerance are validated in a dedicated configuration component. Defaults stage barriers at RCL6; they do not infer affordability from current room reserves. Nominal decay/repair/tower constants match pinned common 2.16.1. Service gates and economy-based profile switching remain unfinished.

Quality passed (481 production / 433 test files, zero Lizard violations). Full unit regression passed: 1,032 tests / 301 files in 8.22 s. Native `npm run test:engine -- --planning-room` passed 400 ticks, committed a standard plan at tick360 with72 ramparts and complete RCL8 structure capacity, survived resets51/121/381, and issued no construction sites. Evidence: docs/evidence/defense-adaptive-native.json (dirty-worktree provenance explicitly retained). Errors/messages empty; this high-budget fixture is not proof of default5CPU timing or broad native regression.

Two earlier runs informed fixture adjustment: the initial10000scan/oneaugmentation default did not finish all1219 layout candidates by400ticks (no script errors, retained best); fixture100CPU allowance now uses100000scans/fouraugmentations. That run committed at364 but missed the old post-commit reset at351. The third reset moved to381 while retaining the400tick completion deadline and all plan assertions. Other engine fixtures, strict budget/default-budget cases and the complete native suite must be requalified before ED-26 closes.


### Default-budget progress and road gates

`npm run test:engine -- --planning-budget` passed80ticks on adaptive native planning:1224candidates enumerated, evaluation advanced to candidate43, and job revision reached64. Cold-start measured botLoop CPU22.8299; later sampled calls also exceeded5CPU. The fixture proves bounded-run progress, not strict5CPU compliance or completed defensive selection. Evidence is archived in docs/evidence/defense-default-budget-native.json with exact bundle/commit provenance (before road-gate semantics below).

Shared candidate evaluation now derives mandatory friendly gates wherever planned roads cross generated barriers, unions explicit gate requirements, and deduplicates/sorts them. This supplies real gate-access accounting for native generated defenses rather than an always-empty requirement list. Native defense revision advances to v2:road-gates to invalidate persisted requests when this semantic change applies. It does not infer every strategic ingress/egress need or implement economy-based stage switching.

Quality passed (482 production / 434 test files, zero Lizard violations). Focused gates/native-policy/pipeline plus smoke: seven tests in301ms, including exact rampart-passable and constructed-wall-blocked diagnostics. No complete native regression or new native run for the road-gate change is claimed. ED-26 remains open for strict budget qualification, economy staging and remaining scenario coverage.


### Declarative defense economy requirements

Generated adaptive barriers now carry `minimumStoredEnergy` alongside their configured RCL. The native default is50000energy, configurable with validated `planningDefenseMinimumStoredEnergy`; the native semantic revision advances to v3:economy-reserve. Requirements describe construction eligibility rather than observing live energy during layout search, avoiding reserve-driven search restarts. Existing/manual barriers retain their original metadata. The optional field passes through proposal conversion, plan validation, persistent commit and store recreation; older plans without it retain a zero reserve requirement.

`defenseEconomyEligible` checks both RCL and observed stored-energy thresholds. ED-27 must invoke this policy before issuing construction sites, with an explicit definition of usable room reserve; that execution enforcement remains unimplemented and must not be claimed complete under ED-26. This is a durable planner/executor contract, not evidence of live affordability enforcement or upkeep sustainability.

Quality passed (483 production /435 test files, zero Lizard violations). Focused economy/native-policy plus smoke: five tests in785ms. Full unit regression:1,036tests across303files in8.31s. Exact reserve/RCL boundaries, preservation of existing barrier settings, invalid metadata and persisted round-trip covered. No new native evidence for this schema extension is claimed.


### Stamp requalification and default-budget failure

Current baseline9a6d263 passed native --stamp-room:400ticks, committed32,88ramparts, complete inventory, resets6/101, no sites/errors/messages. Archived defense-stamp-native.json retains clean provenance. Engine stamp/planning-room assertions now require configured50000energy metadata on generated ramparts; subsequent default-budget run did not reach that assertion.

Native --stamp-budget failed the unchanged1600tick completion gate twice. Initial evidence engine-FBn1Oc reached defense phase but did not expose search internals. Added fixture-only telemetry records generated-strategy count and durable augmentation count. Traced engine-TjC9me proves progress: flow4at700,40at1000,81at1450,88and all3generated strategies at1550; still defense phase at1600, no committed receipt. This is not total search starvation. The default CPU/search policy does not yet satisfy the prior end-to-end deadline; finalization/validation overhead and solver cost need investigation. Do not extend the deadline or claim default completion from the earlier80tick progress check.

Failure evidence and trace are versioned as defense-stamp-budget-failure.json and defense-stamp-budget-trace.json. Required next actions: profile per-phase admission/setup/finalization, improve bounded progress, re-run1600tick completion and late-reset plan comparison, then broaden native regression. ED-26 remains open. These failures are local engine results, not an external blocker.
