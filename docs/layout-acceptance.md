# ED-24 layout acceptance audit

This audit covers standard and constrained strategies. The rewrite and the
remaining layout enhancements have separate acceptance gates.

| Requirement | Implementation and executable evidence |
| --- | --- |
| Both strategies, all transforms, comparison before commitment | Standard/constrained draft and template tests; native planning-job compares two viable strategies; planning-room retains a viable best while comparing more than 1000 candidates before committing. |
| Hard validation before scoring | Draft/capacity/placement/access/lab/road tests reject illegal sharing, excessive RCL counts, trapped spawn/work positions, malformed labs and incomplete paths. Candidate evaluator enters scoring only after draft preparation; fresh native commit validation repeats current constraints. |
| Six score dimensions, deterministic ties and hysteresis | Planning cost and selection tests; planning-job verifies exact hauling/service/capacity/swamp/defense/migration costs, equal-score identity tie-breaking and re-evaluated previous-candidate hysteresis. |
| Persistent resumable work and failure preservation | Enumeration migration/reload, standard/constrained draft resume, planning-job reload/lost-ack recovery, and planning-cpu native timeout recovery. Cycle tests preserve a committed plan after rejected replacement; commit tests cover stale/invalid/concurrent writes. Receipts preserve counts and last rejection. |
| Preservation locks | Preservation and configured-request tests reject moved/retyped locks. Native planning-room preserves its observed spawn and storage coordinates in the committed full plan. |
| Serializable version/provenance and staged bootstrap | Plan schema/commit tests require bootstrap IDs in the final entries; native planning-room commits the actual observed-room plan across reloads. Staging and lab tests cover controller-level ordering; native planning-job selects constrained while planning-room selects standard. Configuration tests explicitly constrain enumeration to the selected strategy. |

## Scope and remaining work

Planning is configurable and disabled by default. Candidate enumeration and
evaluation have cooperative budgets; CPU termination recovery is independently
tested. These are not a guarantee that every synchronous operation stays below
the configured allowance, nor proof of long-term CPU/memory performance.

The native observed-room qualification uses open terrain and explicit larger
operational budgets. Default-budget progress has a separate scenario. Broader
terrain fixtures, default-budget completion times, cache retention, enumeration
retirement and soak measurements remain relevant to ED-25/ED-43. ED-25 owns stamp
composition; ED-26 owns terrain-aware defenses; ED-27 owns construction and
reconciliation with live inventory. The fallback perimeter alone does not
qualify early-RCL defensive economics or live construction.

## Verification

Full unit suite on e0b2763: 895 tests across 255 files passed in 8.46 seconds.
Full native suite on e0b2763: 161 checks passed in 528.96 seconds.
Every ordinary scenario had no engine errors. The CPU recovery scenario had
exactly its required injected timeout; the two harness negative controls failed
as expected and were verified by the suite.
Representative refreshed evidence: planning-room engine-5eN81Q,
planning-job engine-3VA5cw, planning-cpu engine-MZmevj,
planning-budget engine-8MiGcm. artifacts/engine-suite.json indexes all runs.
No production/test code changed during this aggregate run; this audit document
was drafted while it ran. Quality passed for the same code revision
(435 production / 380 test files, zero Lizard violations).

All five ED-24 acceptance criteria are evidenced within the scope above.
This closes ED-24, not the ED-4 epic or the overall rewrite goal.
Earlier per-scenario evidence and intentional legacy corrections are recorded
in layout-strategies.md and planning-acceptance.md.
