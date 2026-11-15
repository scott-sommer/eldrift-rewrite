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
