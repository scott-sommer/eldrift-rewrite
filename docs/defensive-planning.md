# Defensive planning implementation record

ED-26 is In Progress. Baseline implementation: 1db1a55.
Full unit regression: 992 tests/287 files passed in8.14s on2026-11-17.
Latest quality:464 production/418 test files, zero Lizard violations.

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
New cut/exit generation has no native room-scale or production selection evidence.

## Remaining execution plan

1. Define common resumable strategy adapters for cut, exit and legacy fallback.
   Require consistent input/provenance and diagnostics for rejected candidates.
2. Make graph construction and residual edge scans interruptible; augmentation
   counts alone do not establish a practical per-tick CPU bound. Measure open-room
   worst cases before selecting an algorithm/budget policy.
3. Add versioned/reset-safe search state or deterministic replay with incremental
   reconstruction. Heap-only flow is insufficient for production reset recovery.
4. Compose protected regions/controller inclusion and explicit intentionally
   unprotected infrastructure reports. Preserve operator locks and manual barriers.
5. Wire candidate evaluation and weighted selection with economy-driven RCL staging,
   gate policy, powered-tower assumptions and configurable strategy preferences.
6. Integrate into the native candidate pipeline with request invalidation and
   retained-plan safety. Register native open-exit/choke/controller/disconnected/
   fallback/reset fixtures and compare completed defenses via shared validation.
7. Record CPU/memory measurements and acceptance audit, then close ED-26 only
   after every criterion is evidenced. ED-43 owns wider performance/soak gates.

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
