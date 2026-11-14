# Legacy characterization evidence

ED-13 is in progress. The fixture excerpts are copied without semantic edits from legacy commit f2bbf7e8c44addc7c426abb5458e393c9502ff5f. Each excerpt records source file, line and SHA-256; tests use synthetic adapter stubs. These are extracted-function executions, not full-game or real-engine validation. Fixtures are checked in so CI does not require access to the legacy repository.

Run `npx vitest run test/characterization test/smoke` for the focused loop.

| Case | Observed legacy result | Intended rewrite behavior | Owner |
|---|---|---|---|
| Same coordinates, different rooms | Equal | Distinct | ED-18 |
| Opposite border coordinates | Equal | Distinct | ED-18 |
| Numeric position overload | Receiver-dependent stub throws TypeError | Preserve receiver and API semantics | ED-18 |
| Three existing extension sites, fourth planned, cap five | No site created | Create fourth when budgets permit; count each site once | ED-27 |
| Standard fits with score 1, constrained scores 100 | Standard chosen without evaluating constrained | Validate candidates, then compare scores; intentional policy change | ED-24 |
| Path search reports incomplete with a nonempty path | Partial path returned as complete road path | Cannot validate connectivity with incomplete search | ED-23/ED-27 |

Remaining ED-13 work: spawn recipes/priorities; task, mining and hauling transitions; layout transforms/manual entries; threat and recovery decisions; operator parsing; hunter assignment, NaN, dispatch and cache-loss regressions. Add versioned memory/room fixtures and attach corrected-behavior evidence as production capabilities land. Do not equate passing legacy characterization with corrected behavior or capability parity.
