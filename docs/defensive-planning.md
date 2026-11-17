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
