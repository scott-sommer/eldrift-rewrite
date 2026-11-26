# Idempotent quantity pool release

Implementation source: 7700885. Releasing a pool that is already absent returns without saving the ledger. The current claim is still read and validated, and the owner check occurs before the no-change return. Actual pool removal, final-claim deletion, other claims and later booking ownership remain unchanged. This adds no cache, persistent format or spending authority.

Targeted checks passed: 27 tests in six files (354ms), fixed smoke 76 tests in 15 files (492ms), type/lint/boundary checks, Lizard (1041 production and 897 test files, zero violations), and CommonJS bundle validation. Full units and milestone CI were not run.

[Native evidence](evidence/startup-pool-release.json) preserves four clean-source outcomes. Unknown-delivery and unknown-recovery passed; the supported-budget configured 1000-tick campaign passed. The configured 5ms campaign failed the exact receipt calendar.

In the 5ms run, observation 34 completed and approved at 88. Births at 134/155/167 and activations at 155/167/179 matched. First harvest 165, first income 182, harvest 3264 and repair 88 matched. Delivery was 2402 against 3080 predicted, with 40 actual receipt frames against 53 predicted; the first timing difference was tick 228 against 227. This result is not interchangeable with prior failures that missed harvest, and the idempotence change does not prove improved native performance. Preserve all outcomes rather than selecting the best run.

Next work needs courier-level phase and state-operation measurements tied to the same failed run. Existing actor-level traces show aggregate cost but do not identify the expensive native operation or the exact guard that deferred work. Add bounded, opt-in diagnostics that retain live guard behavior, avoid accumulating unbounded Memory, and distinguish instrumented short probes from untraced whole-horizon qualification. Further speculative hot-path edits are not a substitute for identifying that cost. Existing assignment and pool idempotence simplify desired-state processing independently of timing results.

ED-29 remains In Progress. Future household/refill/replacement schedules, shared home capital, longer-route handoff and home-loss integration remain open alongside the 5ms calendar. Later specialist, operator, parity, pressure, migration and RC gates are still required. Do not close the ticket without its full milestone checks.
