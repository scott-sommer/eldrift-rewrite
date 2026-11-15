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
Expanded native suite completed: all166 checks passed in608.35s.
docs/evidence/stamp-engine-suite.json preserves every referenced evidence result
and provenance. Production code stayed unchanged from d0aec0b while documentation
and an anchor-order regression were committed during the run. Per-scenario
provenance records those differing Git heads; no production implementation change
occurred. Evidence audit found no unexpected status or runtime error: planning-cpu
has its asserted intentional timeout, injected-error has its sentinel errors,
injected-timeout has the expected failed status/timeout, and the two Art cases
have their expected single repair-suspension diagnostic.
CPU qualification remains open; functional regression success does not close it.

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

## Measured CPU evidence

docs/evidence/stamp-native-cpu.json preserves whole-bot CPU aggregates and
bundle/engine provenance from the completed functional runs. Through commitment,
explicit stamp-room mean111.42/max155, automatic room mean73.23/max145,
and irregular room mean110.30/max145. These include telemetry, persistence and
other main-loop work; they are not isolated planner timings. The failure scenario
window through100 includes idle ticks and is not comparable as active-search cost.

Inspection found prepareStampComposition calls stampAnchors separately for every
non-hub stamp; each call allocates and sorts the full interior room grid. The
adapter repeats this preparation on each advance before composeStamps checks its
guard. This is a concrete optimization target, not a measured attribution of the
whole-bot CPU above. Preserve deterministic anchor order and preservation-derived
priority when optimizing, and measure default-budget progress after the change.

## Lazy anchor traversal

Replaced repeated full-grid allocation/sorting with Chebyshev ring traversal in
distance then row-major order, stopping once enough anchors are collected.
Preservation-derived anchors retain their existing sorted precedence.
Exact equivalence tests cover boundary/interior hubs and limits1/9/200/2500;
existing transformed-lock and full/irregular composition regressions pass.

Native engine-NdtgIg committed at14 but correctly failed the old assertion that
planning remains incomplete at reload21. The explicit stamp-room family now
reloads at6 and101; automatic comparison and standalone draft retain their
existing schedules. Final engine-UBG2PV passed400 ticks, committed at15,
preserved full capacity and exact previous cost breakdown, errors/messages empty.
The earlier engine-3UIoa8 committed at39. Through-commit whole-bot samples in the
new run:14 samples, mean108.5/max137/sum1519 CPU. Elevated allowance remains100;
faster completion is not proof of a lower per-tick ceiling. Host timing and
reload schedule differ, so this is functional progress with indicative timing,
not an isolated benchmark.

Full unit suite938/267 files passed8.22s; targeted seven tests passed1.11s.
Quality446 production/397 test files, zero violations. The full166-case native
baseline predates this optimization; default-budget and broader native regression
remain to qualify before closing the CPU work.
