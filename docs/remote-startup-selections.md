# Durable startup geometry selections

ED-29 now has a feature-owned store for complete selected geometry, replacing fixture-owned selection authority in the native selected-startup scenario. It does not persist current stock, source facts, workers, execution leases, capital reservations or forward accounting. The default native bot still supplies no selection policy.

`remoteStartupSelections/<home>` is version1, owner `remotes`. It retains at most128 distinct room/source selections and131,072 JSON string characters per home. Each entry records the assignment generation, caller-supplied context binding, selection/expiry ticks and the portable complete five-leg quote. Native observation fields on a completed quote are excluded from persistence. The quote plan must match its identity; every leg must have the expected kind and exact arrival, and the total operations must agree. Partial, corrupt, wrong-home and incompatible envelopes fail closed.

Publication and withdrawal compare the expected revision and reject backwards clocks. A new selection replaces only its own source and reclaims expired entries. Capacity refusal preserves existing live selections; it does not evict another source or grant ordinary allocation. Reads neither initialize memory nor prune expired state. Snapshots are detached through the shared state port.

Lookup requires matching home/room/source, assignment generation, exact ordered body, caller binding and the inclusive validity window. Evidence from a later store clock cannot be read as if it existed in an earlier frame. Maximum validity is10,000 ticks. The caller must freshly derive its binding from relevant policy, topology, traversal and strategy context before every reuse. The store cannot infer a changed world from a previously cached binding. The controlled native fixture uses a constant binding for its unchanged geometry; automatic production binding refresh is still unfinished.

The native expiry case deliberately permits planning only through tick29. Its selection expires while the miner is incubating. Later lookups must remain absent, while the already-paid birth must complete normally and continue source work. This verifies the separation between new-birth admission and paid incubation. It is not permission to continue using stale geometry for new births.

Rollback must disable the policy and reconcile/cancel its unstarted requests under their existing owners before an older allocator can operate. Geometry evidence can then be discarded or rebuilt; it does not replace the authoritative spawn/logistics/task/journal/claim records. Do not relabel queue envelopes or strip live constraints. The complete ED-44 migration/rollback rehearsal remains open.

Quality passes with799 production/648 test files and zero Lizard violations. Twelve new selection cases cover reset recovery, body/context/generation fences, expiry, stale writers, scoped replacement/withdrawal, invalid evidence, incompatible state and bounded growth. Full units:1,728 cases/438 files,11.90 seconds. Focused integration:28 cases/5 files,1.10 seconds. Native and hosted evidence will be recorded after execution.

Next work remains the forward simulator checkpoint, fresh native context/schedule conversion, economic candidate selection and ordinary fixed-service adoption. A durable geometry record is not a forecast or profitability decision.
