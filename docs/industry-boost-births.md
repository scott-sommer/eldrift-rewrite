# Boost requirements carried through spawning

ED-36 source `abc4129` extends the existing shared spawn queue with optional exact boost contracts. This connects producer-selected steps to ordinary native birth and industry orchestration; no separate spawning system or role executor is introduced. The initial implementation is `0a852b3`; final fixture correction retains ordinary upgrader population demand.

## Responsibilities

`SpawnRequest.boost` and `DemandPlan.boost` carry `{ steps, required, timeout }`. A producer can use `selectLegacyBoostPlan` and choose its unavailable/skip policy before attaching selected exact steps. The reusable population demand mechanism copies that contract into newly created requests. It does not change existing queued identities or automatically select role-specific boost policies. Timeouts are 1–1500 ticks and step counts must fit distinct types of the requested body. Native compound compatibility is still checked by the industry executor.

The allocation boundary detaches nested steps as well as body/placement. `populationMemory` copies the admitted contract into transient `CreepMemory.industryBoostBirth`, binding owner/home and a deterministic `birth:[productionRoom,requestId]` identity. The deadline is the actual spawn-admission tick plus ordinary body spawn duration plus the caller's timeout, independently of queue ready/expiry dates. Rejected/retried spawn attempts never give a nonexistent creep readiness; a later actual attempt computes its own deadline.

Before room scheduling, native composition adopts birth metadata into `industry-boosts/empire` with the actual native ID and name. Metadata is deleted only after durable adoption succeeds. A crash/reset between queue admission and metadata removal safely replays the immutable identity. Spawning bodies wait for completion through the existing executor. Owned nonspawning actors receive the existing name-key action gate and native-ID body lease before role work. A different population owner/home cannot inherit readiness.

If the bounded outcome queue is full, the unadopted contract remains on the creep and fences ordinary work until admission is possible. If another admitted boost already holds that actor, waiting birth metadata leaves the admitted owner in control rather than fencing its progress. Late first adoption records an expired outcome without extending its original deadline: required failures remain gated until explicit owner acknowledgement, while optional failures permit fallback. Confirmed outcomes still need to be consumed/acknowledged by their owning producer or operator; generic spawning does not invent a mission decision or silently discard retained outcomes.

No boost contract is added to ordinary demands by default. This is the shared automatic intake for explicitly contracted spawns. Configurable role policies, native unreserved-stock projection, specialist mission producers and operator APIs remain further adoption work. Existing workers are not retroactively selected for boosts. No new operator configuration keys are introduced.

## Persistence and rollback

`spawning/<room>` advances from schema 2 to **schema 3**, owner `population`. Genuine schema-1 requests migrate through placement validation, and genuine schema-2 requests migrate without inventing boost contracts. Boost-bearing data disguised as schema 2 refuses migration without writes. Earlier schema readers refuse the new version, including queues containing no boost requests; this prevents older dispatch from silently ignoring a required contract. Industry boost/task/quantity/structure-intent schemas remain unchanged.

`industryBoostBirth` is spawn-carried feature metadata, not success state. Before deploying pre-intake code, settle or cancel contracted queued spawns and adopt any already admitted birth metadata under current code. Then settle boost attempts and supplies, consume or explicitly acknowledge outcomes, and verify lab/stock cleanup. Preserve actual task/journal/receipt state. Schema-3 queue rollback needs an explicit validated migration/rehearsal; no unsafe downgrade helper is provided. Older code also ignores birth metadata on already spawned actors, even when a room spawn queue happens to be empty. Full cross-version rehearsal remains ED-44 work.

## Evidence

The new `--boost-birth` scenario uses the ordinary queued producer and native spawn. A four-part WORK/WORK/CARRY/MOVE creep costs 300 energy. The fixture selects its exact upgrade steps from actual lab stock before queue submission, keeps ordinary upgrader demand enabled and lets ordinary dispatch create the actor. It never writes a native creep directly for this target.

The first row has no target; the target is observed spawning at tick 2. A module reset immediately after spawn, before intake, witnesses the original contract and deadline 93. The bot admits a boost at tick 22 and resets again before tick-23 observation confirms two actual XGH2O WORK parts. Controller progress stays zero on all unready rows and reaches 260 by tick 100. The lab finishes with zero mineral/energy and no remaining boost claims, pins or attempts; the ordinary spawn request is reconciled away under schema 3. These fixture times are observations rather than travel guarantees. The fixture does not demonstrate every mission producer or every failure type as a newly spawned actor.

Twelve clean final-source engine scenarios pass in 32.000 s: birth, spawn placement/schema migration, spawn contention, worker population, alias fallback, ordinary boost, reaction coexistence, supply, cancel, expiry, Upgrade Room and packaged smoke. Full local checks on final source pass: 1,891 unit cases / 463 files in 12.45 s, focused+smoke 28 / 6 files in 0.311 s, four processor comparisons in 0.200 s, suite-report check in 0.1306742 s, bundle, types/lint/boundaries and pinned Lizard 1.22.2. Lizard reports 865 production / 705 test files and zero violations. [CI 44791110983](https://github.com/scott-sommer/eldrift-rewrite/actions/runs/44791110983) is recorded with its exact source and required step outcomes in the [manifest](evidence/boost-birth.json).

The first clean-source birth fixture run at `0a852b3` remains failed: it submitted an upgrader contract while configuring its ordinary population owner to cancel all upgrader demand. No actor or industry boost queue was created; the verifier then failed while accessing the absent queue. The correction enables that ordinary demand rather than bypassing its owner. The manifest retains its actual empty-target rows and failure separately from the twelve final successes. It is a fixture setup failure, not evidence of successful birth adoption.

The registry has 260 scenarios; the full registry was not rerun. This increment supplies lifecycle and regression evidence, not cross-version rollback or aggregate CPU/memory/soak qualification. ED-36 remains in progress.


Subsequent increment: [automatic worker boost policy](worker-boost-policy.md) adds opt-in ordinary upgrader/builder selection, native funding/promise projection and worker-owned outcome consumption. Earlier manifests retain their source-specific scope and configuration.


Subsequent increment: [operator boost commands](operator-boosts.md) exposes detached inspection, exact/alias admission, cancellation and settled acknowledgement in the packaged bot. General operator, lab/flag and remaining parity obligations are not closed by this API.
