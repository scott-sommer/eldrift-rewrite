# ED-26 defensive planning acceptance

Audit date: 2026-11-18. Production baseline cfaad8eefb37429b78629120dd95d6dd56a24365.
The final increment adds a real-generator fallback test and documentation, without changing production code.

| Criterion | Inspected evidence | Result |
| --- | --- | --- |
| Explicit protection/attacker regions, diagonal separation and legal positions | defense-separation, barrier-cost, terrain-cut-defense; defense-separation and terrain-cut tests; native defense-cut and complete planning-room | Passed. Native attacker entries default to all open border cells; caller overrides remain explicit. |
| Maintenance, repair/gate access, towers and uncovered/exempt assets | defense-operations/access/candidate/protection-report/gates; defense-asset-inventory; corresponding tests; native policy integration | Passed under documented nominal intact-plan/tower assumptions. Exemptions retain reasons; observed valuable owned assets and controller approaches require protection. |
| Common strategies/selection; open exits, choke, controller, disconnected and fallback fixtures | defense-strategies/coordinator, defense-pipeline; exit-perimeter and terrain-cut tests; natural chamber separation tests; native complete rooms/controller inventory and irregular stamp room | Passed. Real fallback test requests an uncuttable terrain interior and keep-clear exit crossing, verifies both alternatives reject and the actual legacy generator wins shared validation. Unit topology evidence complements native integration; universal layout solvability is not claimed. |
| Determinism, budgets, provenance, economy staging and no sites | scan/augmentation caps and sampled admission; recoverable flow/request/coordinator checkpoints; docs/defensive-planning.md provenance; defense-economy persistence tests; native default completion and five-phase reset plan comparison | Passed for planning scope. Generated barriers persist configured RCL and minimumStoredEnergy; planner never issues sites. Execution enforcement is ED-27. Cooperative finite work is not a strict per-tick wall-time ceiling. |

## Milestone validation

- Quality: 484 production / 436 test files, zero Lizard violations; types, lint and dependency boundaries passed.
- Full unit suite: 1,039 tests / 304 files passed in 8.24 s.
- Focused real-generator fallback plus smoke: 4 tests passed in 302 ms.
- Full packaged engine suite: 170 checks passed in 658.86 s against the same clean production commit. Aggregate: docs/evidence/defense-final-engine-suite.json. Every scenario's commit, bundle and engine provenance, status, diagnostics and peak sampled memory/CPU are retained.
- Diagnostics audited: expected planning CPU interruption, injected error/timeout sentinels, and Art repair-suspension notices only. Expected negative scenarios remain marked as such.
- Default stamp completion and reset equality passed inside the full suite. Earlier focused evidence and failures remain chronological; they are superseded where the later clean suite covers the same behavior.

## Boundaries carried forward

ED-27 must define usable room reserve and enforce minimumStoredEnergy plus RCL immediately before site creation, including reserve loss, missing storage, reset and rebuilding. This audit does not claim that unimplemented executor behavior works.

ED-43 retains strict timing qualification, synchronous setup/finalization costs, multi-room CPU/Memory profiles and bounded soak tests. Sampling checks at most every32scan calls bound observation granularity, not elapsed time. Replay can repeat residual work after reset; the final staged plan remains equal.

ED-39/44 retain operator control and legacy migration/rollback acceptance. No live upload or destructive migration has occurred. ED-26 completion is a planning milestone, not rewrite/release completion.
