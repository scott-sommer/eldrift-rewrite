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

## Allocation foundation
SpawnRequest separates stable ID/name/owner, room, priority, readyAt/expiresAt and body from role-memory construction. Pure allocation filters expiry/not-ready/live names, chooses idle spawns deterministically and subtracts each assignment from a shared per-room budget. Lower numbers win, matching legacy descending sort followed by pop (spawner.js around 2608). Equal priorities use stable request ID. Caller explicitly chooses wait (reserve room priority for unaffordable head) or skip (allow affordable lower-priority work); neither blocks another room.
Replacement timing includes body length times three, travel estimate and configurable margin. Allocation is a proposal, never a receipt: it cannot delete persistent requests, prove a native spawn succeeded, or prevent duplicate execution across repeated calls on its own. Those are the next queue/executor responsibilities.
Validation: 227 tests passed in 2.74s; quality gates passed, zero Lizard violations. Tests cover multi-spawn shared energy, multi-room independence, priority, head policy, expiry, not-ready requests, busy spawns, existing names, duplicate identities and replacement boundary. No new engine scenario yet.

## Execution boundary
One executor batch is admitted per tick and sealed before callbacks. Results distinguish accepted, rejected and uncertain (thrown) attempts; failures do not suppress independent assignments. Duplicate spawn/request/name allocations fail before effects. The native adapter injects role-memory creation and verifies spawn ownership/room before spawnCreep.
Validation: 229 unit tests passed in 2.62s; quality gates passed with zero Lizard violations. A new 12-tick pinned-engine spawn scenario proves one accepted request, an observed spawning interval and eventual birth using the 200-energy miner body. The initial stub terrain prevented birth; the scenario now explicitly provides plain birth tiles. Full engine suite was not rerun in this milestone; the new spawn case is registered for future full runs.
Persistent queue acknowledgement and reset reconciliation remain unfinished. Accepted is an API receipt, not proof of eventual birth; the engine scenario separately observes birth.
