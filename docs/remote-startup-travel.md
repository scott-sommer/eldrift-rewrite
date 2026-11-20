# Exact startup travel strategy quotes

ED-29 remains In Progress. `createNativeStartupTravel` combines current startup observations, known-safe room routing, static native path matrices and bounded durable travel work. It quotes an explicit strategy, not a current execution plan. Ordinary selection and movement do not adopt the strategy yet.

## Geometry and workload

The caller chooses one actual spawn, an adjacent spawn exit, a station, a separate adjacent courier collection tile and a separate home deposit service tile adjacent to one actual endpoint. The observer supplies actual source/spawn/endpoint identities and positions. The quote checks native walkability and terrain for the chosen service tiles; this fixed-tile strategy requires interior service tiles. Dynamic traffic is not assumed absent at execution: it remains an admission/movement obligation.

Five separately named legs are measured with exact native path range0: miner exit-to-station approach; full-CARRY miner station-to-deposit retirement; courier exit-to-collection first approach; empty courier deposit-to-collection; and full-CARRY courier collection-to-deposit. Future bodies are unboosted WORK/CARRY/MOVE miners and CARRY/MOVE couriers within current spawn capacity. The shared remote leg helper still defaults to range1 for existing source/controller estimates. A nearby source-range arrival is not reused as exact station arrival. Full-cargo travel uses actual CARRY capacity and terrain/body costs.

The portable courier model now has an optional `initialOutboundTicks` separate from recurring `outboundTicks`. Omission retains prior behavior. An explicit first journey cannot silently replace subsequent empty trips from a different origin. The native travel quote does not yet synthesize the request catalog, prices or home redistribution schedule.

## Ownership, persistence and freshness

`remoteStartupTravel/<home>` version1, owner `remotes`, retains one active candidate identity and at most five completed legs. It creates no per-source namespace growth or horizon-length financial history. Geometry/body, allowed route, current static topology, traversal policy, assignment identity/generation and search bounds fence reuse. Renewing the same assignment expiry does not invalidate geometry; current authority/safety is read again before every resume, and completed output carries fresh source/stock/workforce observations. Old observations are not restored as current facts.

Each call supplies a0–5 completed-leg budget and a caller guard; native searches have an explicit operations bound. A partial/incomplete path is never promoted. The schema validates clock/revision, bounded legs and positions; arrivals are also checked against each exact destination on both insertion and reuse. Clock/revision conflicts cannot overwrite another writer. Input and options snapshots are detached. CPU deferral and global reset can preserve completed geometry, while a lost home, unsafe/unknown route, blocked service tile or changed assignment/topology prevents stale use. The quote updates only existing intel observations and its own progress; it does not reserve stock, submit demand, move workers or grant an execution lease.

This is a new bounded cache namespace, without an earlier schema to migrate. Older versions do not read it. Removal during rollback remains an explicit ED-44 migration/rollback rehearsal obligation rather than an automatic deletion here.

## Remaining operational integration

A selected strategy must bind births to the quoted spawn and enforce its chosen exit through spawn directions and preserve its collection/deposit service geometry in movement before these timings can be treated as operational predictions. Existing live-worker origins/damage/boosts, infrastructure stock, reservation changes, queue contention, alternate endpoints and overlapping handoffs need explicit conversion/strategies. Whole-project schedule generation, compact forward-simulation persistence, candidate solvency/return policy, measured native planning CPU/memory and broader parity/pressure gates remain open. No full forward native timing or economic profitability claim follows from static path completion.
