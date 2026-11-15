# ED-25 acceptance audit

Audit baseline: d0aec0b. Production stamp planning, automatic comparison and
configuration are implemented. ED-25 remains In Progress pending regression
qualification and the CPU-bound interpretation/evidence below.

| Requirement | Evidence inspected | Assessment |
| --- | --- | --- |
| Irregular room, staged serviceable plan or explained failure | stamp-irregular.test.ts; native irregular-stamp-room engine-ylVNBG, commit31, full counts, shared validation and real routing | Demonstrated for four outcrops around a locked storage anchor; not universal solvability |
| Locks/manual entries and corridors | stamp-placement.test.ts covers manual conflicts, metadata retention, blocked ports/corridors and unique structure claims; stamp-room preserves observed spawn/storage | Geometry and native preservation evidenced |
| Labs, egress, RCL capacity, common score | stamp-catalog.test.ts all transforms and RCL lab geometry; final draft validator; native complete room scenarios | Shared validator and scoring pipeline execute; native full-service plans evidenced |
| Determinism and reset/resume | stamp-composition.test.ts serialized incremental equivalence/backtracking/limits; native draft and room reload scenarios | Demonstrated |
| Rejection preserves prior plan | stamp-failure engine-zML5Ki, complete plan-envelope equality after search-limit failure and reload | Demonstrated for policy-triggered bounded search exhaustion |
| CPU bounded | per-step and cumulative attempt caps, bounded anchor pool, cooperative guard, road-search allowances | Algorithmic limits demonstrated; hard per-tick CPU ceiling and default-budget stamp completion are not established |
| Extension contract and extra example | layout-strategies.md; test/examples/blueprint-layout-strategy.ts and three executable tests | Demonstrated at shared evaluator boundary; example is not a full production colony strategy |
| Free-form future work separately tracked | ED-45 https://veskar.atlassian.net/browse/ED-45 | Deferred post-release enhancement, not an initial RC prerequisite |

Final full unit run: 937 tests across267 files passed9.35s.
Expanded engine suite launched against d0aec0b; result is pending and must be
read from the completed process and evidence before any acceptance claim.
Do not use an older artifacts/engine-suite.json as the current run's result.

CPU caveat: preparing stamp anchor lists, reconstructing compact choices and
serializing persistence perform synchronous work. Cooperative guard checks and
finite attempt counts do not prove a requested millisecond ceiling. The existing
elevated-budget native scenarios qualify behavior, not default-budget latency.
ED-43 retains full CPU/memory/soak qualification; ED-25's CPU criterion must be
assessed explicitly rather than silently checked from green functional tests.

Current search also stops at the first fully placed composition before routing.
If whole-draft routing/validation rejects it, the outer hub candidate is rejected;
it does not enumerate every alternative composition at that hub. Failure remains
bounded and explained, but this limits solution coverage.
