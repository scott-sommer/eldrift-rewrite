# ED-19 spawning foundation acceptance

Audited 2026-11-14 against the Jira criteria. This completes the reusable spawning/population foundation, not all specialist population policy or the running economy.

| Criterion | Evidence |
| --- | --- |
| Pure bounded recipes; deterministic ordering; separate role memory | body.ts and economy-recipes.ts; unit budget/part/ordering tests; committed-legacy differential tests compare three economy recipes at 389 budgets each. Native spawn receives an injected memory factory; population.ts supplies owner/home independently. |
| Stable identity, owner, priority, expiry, replacement timing and head policy | Durable per-room identity sequence and versioned owner-checked queues; expiry/readiness and observation reconciliation; allocator preserves lower-number-first legacy ordering. wait/skip is explicit. replacementDue and reconcileDemand use replacement body spawn time, travel and margin. |
| Multiple spawns without duplicate demand | Shared per-room allocation budget, observed/spawning name filtering, scoped demand application, durable empire dispatch admission and per-tick executor sealing. Unit tests cover reconstruction with another pending request and failure before effects. Engine contention case exercises multiple spawns, two rooms and scarce energy. |
| Characterization and engine coverage | Legacy body comparison plus explicit 200-energy miner correction. Bootstrap/established room policy tests, storage/filler correction tests, cancellation/expiry/priority tests. Twelve-tick native spawn fixture observes one acceptance, spawning, queue handover, preserved owner/home and birth while reconstructing coordinator. RCL8 contention fixture observes one local and one independent remote spawn and retained unaffordable demand. |

Composition contract: feature policies call applyPopulationDemand with current population and a pure body plan. After all room demand planning, invoke one createSpawnCoordinator with observeSpawning and createNativeSpawn(populationMemory or a feature-aware memory factory). Its durable admission covers the whole empire, so do not create one dispatcher per room. Failed observation/allocation after admission waits one tick; no uncertain same-tick retry.

Main still has no gameplay producers; ED-20/21/22 must register colony behavior with these ports. Empty bootstrap fixture memory is not a completed mining task assignment. Spawning claims here are backed by fixtures using production modules, not deployment.

Remaining legacy policies are required in their consuming features, not discarded:
- Energy/mineral station demand, mineral and keeper-specific miner bodies: ED-20 and ED-29/35.
- Courier capacity sizing and delivery assignments: ED-21; infrastructure workers and recovery coordination: ED-22.
- Scout/reserver/claimer demand and bodies: ED-28/29/30.
- Upgrade Room specialized worker sizing: ED-31.
- Defense, assault, healer, quad, truck and power-harvester bodies/boost coordination: ED-32/33/34/35/36.
- Operator/manual request payloads and specialist invocation parity: ED-39.
- All remaining body/policy parity must be included in ED-42's final matrix. No full role parity is claimed by closing this foundational issue.

Limitations: no native spawn cancellation after acceptance; queue cancellation only affects pending requests. Whole-isolate reload during spawning is not covered by service reconstruction tests. Cross-shard identity/import policy and live migration remain release work. Recipe comparisons isolate sizing from bootstrap globals; new budget policy deliberately requires a filler before relying on stored energy. Finite queue and validation failures preserve existing state rather than silently truncating demand.
