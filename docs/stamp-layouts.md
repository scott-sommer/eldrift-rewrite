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
