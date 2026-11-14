# Persistence implementation contract

State records use an owner/version/data envelope. Opening validates ownership and future versions, migrates an isolated snapshot and commits only validated plain data. Explicit saves require an initialized current-version record. Caller mutations do not persist automatically. Memory.eldrift format 1 is isolated from legacy keys; unknown/corrupt roots are preserved and rejected.

Migration batches checkpoint after each successful record and stop at a record cap or injected CPU admission boundary. Failure leaves the cursor on the failed record. A reset after a record write but before its checkpoint can replay that record, so record migration must be idempotent. Plan IDs must identify an immutable ordered key manifest; callers must not reuse an ID with changed ordering. Per-record migrations are synchronous and must themselves remain bounded. The batch helper does not yet supply production plan storage or a migration registry.

Intel state records lastSeen and IDs. Unseen rooms retain prior intelligence; a later explicit observation can replace stale object lists. Freshness is computed from lastSeen. Reconstruction after JSON serialization preserves data and leaves unrelated plan/legacy namespaces alone.

Current scope is infrastructure and intel. Colony/task/mission/plan/operator schemas, reservation cleanup, bounded cache reconstruction, production migration wiring and memory diagnostics remain ED-16 work. No legacy memory is automatically imported. Import compatibility and rollback must be rehearsed under ED-44 before release; RawMemory segments remain deferred until measured need.

Latest persistence+smoke: 26 tests passed in 223ms; quality gates pass.
