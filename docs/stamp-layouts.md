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
