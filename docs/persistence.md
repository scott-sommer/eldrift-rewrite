# Persistence implementation contract

State records use an owner/version/data envelope. Opening validates ownership and future versions, migrates an isolated snapshot and commits only validated plain data. Explicit saves require an initialized current-version record. Caller mutations do not persist automatically. Memory.eldrift format 1 is isolated from legacy keys; unknown/corrupt roots are preserved and rejected.

Migration batches checkpoint after each successful record and stop at a record cap or injected CPU admission boundary. Failure leaves the cursor on the failed record. A reset after a record write but before its checkpoint can replay that record, so record migration must be idempotent. Plan IDs must identify an immutable ordered key manifest; callers must not reuse an ID with changed ordering. Per-record migrations are synchronous and must themselves remain bounded. runPersistentMigration supplies versioned Memory-backed checkpoints and stores the exact ordered manifest, rejecting changes under the same plan ID. A production migration registry and tick admission integration remain pending.

Intel state records lastSeen and IDs. Unseen rooms retain prior intelligence; a later explicit observation can replace stale object lists. Freshness is computed from lastSeen. Reconstruction after JSON serialization preserves data and leaves unrelated plan/legacy namespaces alone.

Colony, task, mission, plan, operator, intel and reservation schemas now exist alongside bounded caches and serialization diagnostics. Production lifecycle/migration wiring and representative memory measurements remain ED-16 integration work. No legacy memory is automatically imported. Import compatibility and rollback must be rehearsed under ED-44 before release; RawMemory segments remain deferred until measured need.

Latest persistence+smoke: 26 tests passed in 223ms; quality gates pass.

Exclusive reservation schema/store now tracks resource key, holder, lifecycle scope and expiry. Contending holders/scopes are rejected; same-holder renewals are allowed. releaseHolder supports confirmed death/cancellation, releaseScope supports mission cancellation or colony ownership transfer, and expiry uses an exact tick boundary. Callers must supply confirmed lifecycle events; absence from room vision is not death. This is an exclusive-slot primitive, not a quantity reservation ledger. Runtime cleanup wiring and resource-quantity reservations remain capability work. Persistence/smoke 28 tests pass in 276ms; quality passes.

measureSerialization reports JSON UTF-16 code units and UTF-8 bytes separately, plus elapsed time in the injected clock's units. Timing includes plain-data validation/copy and final serialization; it is not a claim about engine Memory serialization CPU. Run on demand or staggered, not automatically each tick. RawMemory segment decisions must use representative state measurements plus engine evidence. Unicode accounting and non-mutation tests pass; latest persistence/smoke 30 tests passed in 262ms and quality passed. Production telemetry wiring and representative size reports remain pending.

Production main now loads operator/config through the isolated Memory adapter. The app-level provider validates and caches one snapshot per tick, preserving shared and room precedence. Saved configuration changes take effect next tick; rebuilding the provider after a serialization reset recovers the same values. Empty state initializes an empty operator config (defaults), without touching legacy namespaces. Corrupt configuration is rejected and reported by the outer loop rather than silently replaced. Full suite 132 tests passed in 2.00s; quality and synthetic packaged bundle checks pass. No live deployment occurred.

Confirmed unit retirement clears its task queue and releases only that holder's claims. Cleanup is replayable across resets. The caller must supply confirmed retirement; absence from a visible-room observation is deliberately insufficient. Live unit lifecycle wiring remains part of the execution framework integration.

Persistence validation rejects sparse arrays even when an extra named property masks the missing index count, avoiding silent JSON data loss.


Persistent migration evidence: 36 persistence/smoke tests passed in 281ms; type, lint, dependency boundaries and Lizard passed with zero violations. Integration tests use the actual Memory adapter with synthetic version-1 records: one-record batching, JSON reset, version-2 conversion, changed-manifest rejection, completion replay and failure checkpoint preservation. This is local contract evidence, not an engine migration rehearsal or legacy-memory import.

The production loop now accepts a migration gate before configuration/world reads. The composition root supplies an explicit empty registry while all deployed rewrite schemas remain initial-version schemas. Future upgrades register immutable ordered plans there. The gate shares a ten-record allowance across plans and admits each next record only below half the tick CPU limit; records themselves must remain bounded because synchronous migrations cannot be preempted. Repeated calls in a tick cannot consume another batch. An incomplete or failed migration blocks normal gameplay; outer-loop error reporting handles failures and retries on a later tick. This is a startup compatibility gate, not a background migration of live mutable gameplay state.

Validation: 144 tests passed in 2.16s, quality/Lizard passed, packaged synthetic bundle passed. Actual engine timing and legacy import remain unverified.
