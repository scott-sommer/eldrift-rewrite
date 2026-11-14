# Persistence implementation contract

State records use an owner/version/data envelope. Opening validates ownership and future versions, migrates an isolated snapshot and commits only validated plain data. Explicit saves require an initialized current-version record. Caller mutations do not persist automatically. Memory.eldrift format 1 is isolated from legacy keys; unknown/corrupt roots are preserved and rejected.

Migration batches checkpoint after each successful record and stop at a record cap or injected CPU admission boundary. Failure leaves the cursor on the failed record. A reset after a record write but before its checkpoint can replay that record, so record migration must be idempotent. Plan IDs must identify an immutable ordered key manifest; callers must not reuse an ID with changed ordering. Per-record migrations are synchronous and must themselves remain bounded. The batch helper does not yet supply production plan storage or a migration registry.

Intel state records lastSeen and IDs. Unseen rooms retain prior intelligence; a later explicit observation can replace stale object lists. Freshness is computed from lastSeen. Reconstruction after JSON serialization preserves data and leaves unrelated plan/legacy namespaces alone.

Current scope is infrastructure and intel. Colony/task/mission/plan/operator schemas, reservation cleanup, bounded cache reconstruction, production migration wiring and memory diagnostics remain ED-16 work. No legacy memory is automatically imported. Import compatibility and rollback must be rehearsed under ED-44 before release; RawMemory segments remain deferred until measured need.

Latest persistence+smoke: 26 tests passed in 223ms; quality gates pass.

Exclusive reservation schema/store now tracks resource key, holder, lifecycle scope and expiry. Contending holders/scopes are rejected; same-holder renewals are allowed. releaseHolder supports confirmed death/cancellation, releaseScope supports mission cancellation or colony ownership transfer, and expiry uses an exact tick boundary. Callers must supply confirmed lifecycle events; absence from room vision is not death. This is an exclusive-slot primitive, not a quantity reservation ledger. Runtime cleanup wiring and resource-quantity reservations remain capability work. Persistence/smoke 28 tests pass in 276ms; quality passes.

measureSerialization reports JSON UTF-16 code units and UTF-8 bytes separately, plus elapsed time in the injected clock's units. Timing includes plain-data validation/copy and final serialization; it is not a claim about engine Memory serialization CPU. Run on demand or staggered, not automatically each tick. RawMemory segment decisions must use representative state measurements plus engine evidence. Unicode accounting and non-mutation tests pass; latest persistence/smoke 30 tests passed in 262ms and quality passed. Production telemetry wiring and representative size reports remain pending.
