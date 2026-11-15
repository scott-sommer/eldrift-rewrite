# Stamp composition (ED-25, in progress)

The third layout strategy will assemble independent hub, spawn, extension, lab
and support stamps rather than require one fixed core footprint. Existing
assessment, resource infrastructure, final road routing, hard validation, score
breakdowns, plan commitment and construction separation remain shared.

## Implemented foundation

placeStamp accepts explicit staged cells and road-connection offsets, an anchor
and transform, a current partial draft, observation, reserved corridor cells and
a movement-blocking policy. It returns a detached combined draft or an explained
atomic rejection. Matching existing structures and roads retain their metadata;
duplicate cells within a stamp reject. All eight transforms use the shared
geometry implementation. Ports must be present as roads and traversable;
blocked ports/corridors and conflicting terrain/constraints reject.

Locks outside the current partial draft are intentionally not required yet.
Locks on touched cells require the exact structure type. The final whole-plan
validator remains responsible for satisfying every lock, controller capacities,
lab ranges, all-stage access and complete routes. Admission is not proof of
a complete serviceable colony. No runtime strategy is enabled by this module.

## Remaining implementation

1. Define cohesive staged stamps with viable reagent/output lab geometry,
   explicit road connections and preservation-aware reuse.
2. Add deterministic bounded placement/composition search with serializable
   cursors, explicit rejection reasons and revision identity.
3. Connect its draft phases to existing infrastructure/road completion and
   common candidate evaluation; extend enumeration/configuration/native policy.
4. Qualify irregular-room fixtures that reject fixed cores, lock/corridor/RCL
   failures, reset/CPU recovery, and retention of the previous committed plan.
5. Document the extension contract with a small additional strategy example.

Five placement tests pass, including all transforms, detached/manual metadata,
terrain/lock/corridor failures, blocked/missing ports and atomic bounds failure.
Fast smoke passes. Quality: 436 production / 381 test files, zero violations.
Full suites were not rerun for this unregistered pure capability.

## Resumable placement search

searchStampBatch reuses candidateBatch to stream viable placements in explicit
anchor order, then transform order 0..7. Each call consumes at most its attempt
budget and checks the cooperative guard before each placement. Results include
new matches, a serializable detached cursor, completion status and the last
rejection for that batch. The composition layer must retain the chosen matches
and own any backtracking; this search does not greedily commit a whole layout.

The signature binds the stamp definition, anchor order, current partial entries,
reserved corridors and explicit observation/movement-policy revision. Callers
must change that revision when either observation or movement rules change.
Stale cursors reject; a yielded batch is distinct from an exhausted empty search.

Irregular three-cell alcove tests find only transforms 0 and 6; serialized
three-attempt batches exactly match uninterrupted search. Tests also cover
zero-work yielding, exhausted failure reasons, stale definitions/constraints,
invalid budgets and detached state. Nine stamp tests pass in 279ms; smoke in
188ms; quality passes (437 production / 382 test files, zero violations).
Runtime registration and full composition acceptance remain outstanding.

## Staged catalog

createStampCatalog builds independent hub, spawn, five-extension strip,
reaction-lab and support stamps using injected structure limits. It includes
all native maximum spawns/extensions/towers and factory/power spawn/nuker/
observer capacity, plus storage/terminal and one hub link. Source/controller/
mineral infrastructure and remaining links belong to the existing attachment
pipeline, not duplicate catalog entries.

The lab stamp selectively reuses stageConstrainedCore's corrected lab/road
geometry and reagent-first staging, excluding its storage/terminal/link.
Its provenance is the existing constrained-template correction rather than a
new unverified reaction pattern. Hub/service/extension stamp geometries are
new, independently placeable primitives. Every stamp declares traversable road
connection ports. Extension strips allow narrow terrain pockets; support stamps
are small single-structure groups.

Catalog tests validate total service capacity and every RCL cap, all eight
transforms and road ports, all staged lab reaction ranges, independent returned
definitions and invalid capacity input. Twelve stamp tests pass in 307ms;
smoke passes in 189ms; quality passes for 438 production / 383 test files with
zero violations. This is pure geometry/staging evidence. Whole-room reachability,
composition/backtracking, shared-inventory accounting and native registration
remain outstanding; no claim of complete irregular-room planning is made.

## Shared structure accounting

Stamp placement now returns a detached list of claimed type/tile keys.
Composition must pass these claims to the next placement. An existing/manual
structure may satisfy the first matching stamp while retaining its metadata;
a later stamp cannot count that same physical structure again. Roads and
ramparts remain shareable. Claims participate in search identity, so a saved
search cannot resume against a different partial allocation.

Rejected alternatives never mutate previous claims or entries. Backtracking
can restore an earlier draft/claim pair. This establishes allocation ownership;
the composition layer still needs to carry it across branches, reserve prior
ports, enforce aggregate RCL capacities, and connect final routes.

Validation: 13 stamp tests across three files pass in 314ms; smoke in 179ms;
quality passes (439 production / 383 test files, zero violations). New regression
adopts a manual spawn once, rejects duplicate capacity, accepts a distinct
second location and proves the original branch remains unchanged.

## Composition search

composeStamps performs deterministic depth-first composition with backtracking.
Each successful stamp contributes distinct claims and reserves its road ports
against later blockers. Combined draft capacity is checked after every placement.
A compact checkpoint stores chosen ordinals and per-depth cursors, not copies
of every partial layout. Resumption reconstructs and validates the branch from
the same revision-bound input before continuing.

Per-call attempts and a cooperative guard bound search work; reconstruction
also checks the guard between stamps. Input is capped at 64 stamps and 2500
anchors. Repeated calls can explore a large search tree: a total search ceiling,
production anchor ordering and performance qualification remain integration work.
Completion means every supplied stamp fits; it does not certify inter-stamp
routing, whole-room access, defenses or a committable candidate.

Tests demonstrate serialized single-attempt equivalence, actual backtracking
when only the first anchor can hold a later storage stamp, failure preservation,
stale/corrupt cursor rejection and combined RCL capacity rejection.
Quality passes (440 production / 384 test files, zero violations); smoke passes.

## Total composition budget

Composition checkpoint v2 retains totalAttempts across calls. The injected
maximumTotalAttempts defaults to 100000 (allowed 1..1000000) and participates
in request identity. Exhausting it produces rejected/search-limit while keeping
the last geometric rejection in the checkpoint. A complete solution on the
final permitted attempt wins over exhaustion. This bounds total exploration,
not wall-clock cost of a synchronous placement or branch reconstruction.

Version 1 composition cursors reject rather than fabricate consumed counts.
This is an unregistered development capability; no live migration is implied.
Five composition tests pass in 272ms, including cross-call exhaustion,
zero further attempts after exhaustion, changed-limit identity and success
on the exact limit. Smoke passes in 188ms; quality zero violations
(440 production /384 test files). Production anchor policy and full draft
routing/evaluation integration remain outstanding.

## Shared draft completion pipeline

stampDraftBatch connects composition to attachInfrastructure and
finishDraftBatch. It requires the composition's storage to match the candidate
anchor, adds resource/auxiliary infrastructure, routes to all non-road entries,
then uses the existing final hard validator. A separate road checkpoint survives
composition replay and cooperative pauses. Pending composition never begins
road search; incomplete paths never expose a successful draft.

attachInfrastructure now accepts general staged placements rather than only
core-tagged entries. Auxiliary placement reuses a supplied factory instead of
requesting a second one; its existing additional-link policy is unchanged.
This resolves the catalog/attachment duplicate factory conflict without
discarding the catalog's chosen factory geometry.

Final validation: quality passes (441 production / 385 test files, zero
violations); 11 targeted infrastructure/standard/stamp tests pass in 376ms;
full unit suite 918 tests / 260 files passes in 8.71s. Smoke passed earlier in
the iteration. These are contract/failure tests, not successful native stamp
layout evidence. Anchor policy, strategy registration, full successful routing
fixtures and native qualification remain open.

## Preservation-aware anchor policy

stampAnchors derives anchors from matching owned/locked structures under all
eight transforms, deduplicates and ranks those first, then ranks remaining
interior anchors by Chebyshev distance from the selected hub and row-major tie.
Hostile structures are not promoted. A caller limit bounds returned anchors;
the geometry admission phase still handles terrain and occupancy. An anchor
can be an empty stamp origin, so testing its terrain alone would be incorrect.

Tests verify transformed reuse, ordering independent of observation order,
duplicate-lock deduplication, hostile exclusion, interior bounds and detached
results. Three tests pass in 287ms; smoke in 190ms; quality zero violations
(442 production /386 test files). Integration must give each stamp its own
anchor sequence and pin the hub to the candidate storage position. This policy
is not yet wired into native candidate generation.

## Per-stamp anchor integration

Composition accepts anchorsByStamp, retaining the shared-anchor option for
simple callers. Each depth validates ordinals against its own candidate count,
including the terminal zero cursor. Anchor-list changes invalidate saved search
identity. prepareStampComposition connects the catalog and preservation-aware
policy: hub is pinned to candidate storage; other stamps receive independently
ranked bounded lists. Inputs/returned placements remain detached.

The draft pipeline forwards these lists. Tests verify independent pinned
placements, serialized resumption, changed-list rejection, per-depth cursor
bounds and observed-spawn prioritization. Twelve targeted composition/policy/
draft tests pass in 391ms; smoke 202ms; quality zero violations
(443 production /387 test files). Native registration and successful full
catalog/road qualification remain outstanding.

## Full catalog and native draft qualification

Full catalog composition now has an executable regression: all 27 stamps compose
around fixed storage25,25 with 200 anchors per non-hub stamp and a total10000
attempt ceiling. Serialized500-attempt calls preserve the final service counts.

New native --stamp-draft runs the shared draft pipeline with real PathFinder,
controlled planningObservation input and planningLimits, 100 placement attempts
and two road searches per tick. It finishes at tick141 after9387 placement
attempts and95 road connections, passing final shared hard validation. Harness
asserts 60 extensions,3 spawns,10 labs,6 towers,6 links and one of each singleton
service structure. Two code reloads at ticks21 and101 exercise composition and
road progress. Final engine-y0K1f2 passes with empty errors/messages and the same
completion counts/tick as pre-reload engine-EMRJQY.

Quality:443 production /389 test files, zero violations. Full-composition,
draft and smoke regression:7 tests /3 files pass1.19s. Registered in the expanded
162-case engine suite; aggregate not rerun for this test-only addition.

This is complete native pathfinding/draft evidence for a controlled open-room
observation, not observed-room admission, scoring/commit, production activation,
irregular terrain qualification or CPU performance proof. The high placement
count motivates subsequent search profiling; the declared total ceiling was
not raised to obtain this success.

## Shared strategy registration

createLayoutStrategies accepts an optional stamps version and explicit stamp
search settings. The new adapter prepares pinned-hub composition, seeds operator
entries, retains the existing operator amendment before final routing and maps
draft progress/failure/completion to LayoutStrategy. Common candidate evaluation
still owns score preparation, proposal provenance and hard validation.

Outer stamp candidates use transform0; independent stamp transforms are searched
inside composition. Other outer transforms reject explicitly. Standard and
constrained registration is unchanged when no stamp version is supplied.
Native evaluator options can carry the optional version; production policy,
request admission and enumeration are not yet enabled for stamps.

Eight strategy/evaluator tests across two files pass in478ms; quality passes
(444 production /390 test files, zero violations); smoke passes. Tests cover
opt-in registration, serialized adapter progress and explicit outer-transform
rejection. Full native scoring/commit and irregular-room acceptance remain open.

## Persistent hub enumeration

Enumeration now supports an optional stamps source after standard/constrained,
sharing the per-call attempt budget. Hub anchors reuse the bounded preferred/
controller/center pool without requiring a constrained-core footprint.
Each hub is emitted only at transform0; stamp rotations belong to composition.
Compact/public schemas accept stamp IDs only when their cursor history contains
the same coordinates and reject nonzero outer transforms. Old enumeration data
without stamps remains valid; no stored state is rewritten merely to add this
optional strategy. Request admission still does not emit stamp options yet.

Thirteen enumeration/store tests across three files pass in567ms, including
serialized resume and shared budget ordering; smoke passes. Quality:
445 production /391 test files, zero violations. Production request/policy
enablement and native scored commitment remain next.

## Explicit native stamp requests

layoutStrategy=stamps now prepares only stamp hub candidates and captures a
normal ready planning request. Native policy registers stamps-v1; native work
identity binds that version and validates nonempty optional stamp revisions.
The existing perimeter fallback accepts stamp placements using the same
non-resource structure bounds used for constrained layouts. Terrain-aware
defense alternatives remain ED-26.

Planning stays disabled by default. Auto currently compares standard and
constrained only; automatic stamp participation is still outstanding.
Hub candidate count uses planningAnchorLimit; inner composition currently uses
adapter defaults (200 anchors,100 attempts per step,100000 total attempts).
Exposing those inner settings through runtime config is remaining work.

The native policy identity tuple now includes stamp version, so development
requests created with the old tuple restart through existing identity guards.
Committed plans are retained until a validated replacement is available.
No live deployment or memory migration was performed.

Quality passes (445 production /391 test files, zero violations). Full unit
suite:929 tests /265 files passed8.58s. One obsolete unsupported-strategy test
initially failed; replaced with missing-controller failure coverage and added
explicit ready stamp admission. Native observed-room score/commit qualification
has not yet been run for this activation.
