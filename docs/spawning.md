# Spawning port record

ED-19 in progress. Pure body sizing lives in capabilities/spawning; it neither reads room state nor creates role memory.

Source: read-only Eldrift-Directive spawner.js at baseline f2bbf7e8c44addc7c426abb5458e393c9502ff5f, buildRoadScavengerBody (around line 426) and getBody miner/courier branches (around lines 648-760). This is source-derived selective porting; direct executable differential characterization remains to be added.

Preserved:
- Scavenger repeats CARRY/CARRY/MOVE, adds CARRY/MOVE when the remainder permits, caps budget at 1600.
- Courier uses grouped CARRY then MOVE below 1100; at 1100 and above includes WORK between grouped CARRY and MOVE, with the legacy 2600 budget cap and at most 50 parts.
- Ordinary source-miner bodies retain 300/550/800/900 energy tiers and ordering.
- Body plans expose exact cost and three ticks per part. Memory creation and room policy are separate.

Deliberate correction: legacy ordinary miner returns a 300-energy body even below that budget. The new sizing returns an affordable WORK/CARRY/MOVE body at 200, and no plan below 200. Room recovery policy will explicitly choose current available energy instead of hiding that decision inside sizing.

Not yet ported: mineral/keeper/boost/specialist recipes, request ownership and persistence, cancellation/expiry, allocation across spawns, role memory, demand, replacement policy, and native spawn execution. No claim of complete spawning parity.

Validation: 223 tests passed in 2.58s; quality gates passed with 83 production files and zero Lizard violations. Recipe tests cover threshold boundaries, ordering, detached outputs, every 25-energy budget from 0 through 10000, and part limits. No engine spawn scenario executed yet.
