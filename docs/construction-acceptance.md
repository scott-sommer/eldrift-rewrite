# ED-27 construction acceptance

Production baseline a6779f7b5d25200c3a4c373fd12055ed85fd3093. This records functional construction evidence; ED-22 prerequisite reconciliation remains open, so ED-27 is not closed by this audit.

| Criterion | Inspected evidence | Result |
| --- | --- | --- |
| Desired entries classify with reasons and reconstruct loss | construction eligibility/executor/retries and stored-cycle tests; native construction, construction-lifecycle and construction-retry | All seven eligibility statuses are explicit. Presence wins over downgraded staging/reserve/caps. Native road loss triggers a replacement site after capacity unlocks. Built completion is fixture-injected; builder execution is separately covered by work/colony scenarios. |
| Stable-key deduplication/manual precedence and budgets | construction-entries, reservation-ledger, executor and native-port tests; native construction/runtime | Manual metadata wins in either input order; conflicting same-authority metadata rejects. Physical IDs count once; shared per-tick ledger includes accepted requests before native visibility across rooms. Native fixture proves room-cap refusal; cross-room global-cap proof is unit evidence. |
| Bootstrap and economic ordering, remote infrastructure | construction-entries/order and authority tests; native construction-runtime/lifecycle and construction-remote | Persisted bootstrap spawn ranks first, then configured structure classes and deterministic priorities. Remote port allows only explicitly approved visible neutral/self-reserved roads/containers at real RCL0. Registered feature remains owned-room only; mission activation/desired-work supply belongs ED-29. |
| RCL staging, blocked/invalid work, additive migration | eligibility, stored-cycle and retry boundary tests; native lifecycle/error-retry | Desired plan/revision/bootstrap remain unchanged through RCL downgrade/recovery, reserve49999/50000/0, loss and module reset. Invalid native arguments quarantine; transient native failures back off and quarantine after bounded attempts. Occupancy/dependency waits can be observed again without issuing site requests. Plan/policy refresh or observed presence resets failed history. Construction never dismantles structures. |
| Real-engine sites/caps/RCL/reset/loss/bootstrap | six construction scenarios inside the clean full native suite | Passed. Runtime fixture invokes production main; remote and fault-injection fixtures exercise the shared executor/native boundary directly. Their limits are documented in docs/construction.md. |

## Milestone validation

- Full unit suite:1,073tests/314files,8.19s; quality500production/451testfiles,zero Lizard violations, types/lint/boundaries passed at the production baseline.
- Full packaged native suite:176checks,663.13s, all clean a6779f7. docs/evidence/construction-final-engine-suite.json retains exact per-case provenance, diagnostics and sampled peaks. Expected diagnostics only: forced planning CPU interruption, injected error/timeout cases and Art repair-suspension notices.
- Default-budget stamp and late-reset plan comparison passed within the complete run. The earlier failed aggregates and isolated outcomes remain recorded; no failure was removed or deadline relaxed. This one aggregate plus targeted runs does not satisfy ED-43 repeated pressure/soak qualification.
- Construction CPU admission is cooperative. Neither the default3CPU allowance nor sampled whole-bot CPU is a strict synchronous elapsed-time ceiling. ED-43 owns multi-room CPU/Memory and soak acceptance.

## Remaining ownership and release gates

ED-22 still owns final worker-role reconciliation. ED-29 owns activation through remote missions. ED-39 owns typed operator construction retry/reset controls and plan/manual input adapters; ED-44 owns legacy state import, rollback and release compatibility. A completed construction subsystem does not establish those capabilities or full rewrite completion. No live upload or destructive gameplay action occurred.
