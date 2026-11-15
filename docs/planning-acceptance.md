# ED-10 planning baseline acceptance

All 60 modules have hashes, source symbols, static reachability classification, proposed owners, porting dispositions and Jira mappings. Audit corrected a missing dormant courier mapping (ED-21) and the object-literal patroller export (run at line 12).
All 60 registered console operations have handler/source references, proposed owners and test requirements. All 26 documented flag forms have behavior descriptions, source candidates and porting test requirements. operator-behavior.md records reviewed semantic differences and inactive paths; runtime characterization remains ED-13 and feature work.
Architecture decisions, charter, full goal, roadmap/backlog, development instructions, test cadence, provenance and regression register are versioned. Every parity evidence record remains explicitly not implemented. This completes the initial planning inventory, not the rewrite or proof of gameplay behavior.

Future source discoveries refine the inventory under the responsible feature ticket. Do not classify an implemented capability as deferred without user agreement. Preserve exact source SHA and file hashes when porting.

Validation: 60/60 modules have owners/issues/symbols; 60/60 console controls have owners; 26 documented flag records; source hashes previously verified against the frozen checkout; git diff --check passes. No production test suite exists yet. Local SSH publication remains blocked by the wrong account; local commits are intact.

## Completed-attempt diagnostics (ED-24)

Completion receipts now retain evaluated/rejected candidate counts and the last
candidate rejection identifier/reason, derived from the saved checkpoint rather
than supplied by the caller. Full candidate history and retained proposals are
still retired. Existing v2 receipts without diagnostics remain readable; no
invented historical counts are introduced.

Regression evidence covers a successful commit followed by a rejected replacement:
the original plan remains byte-for-byte equivalent as plain data, the failure
receipt survives store recreation, and the unchanged request stays idle. Receipt
validation rejects inconsistent counters and malformed rejection data; detached
return values cannot mutate persisted diagnostics.

Validation: quality passes (435 production / 380 test files, zero Lizard
violations); targeted planning receipt/store/cycle tests and fast smoke pass.
This is persistence/unit evidence, not proof of recovery from native hard CPU
termination. ED-24's reset/CPU-exhaustion gate remains open.

## Native CPU termination and recovery (ED-24)

The packaged --planning-cpu scenario runs the existing two-strategy native
planning evaluator for 230 ticks. At tick 50 it exhausts the runtime allowance
inside the candidate-step wrapper while a candidate checkpoint is pending.
The harness requires exactly one driver error, matching the native
"Script execution timed out" message and the injected wrapper stack frame.
It compares persisted job and plan snapshots around the interrupted tick.

Verified run engine-kIlvFl: job revisions at ticks 49/50/51 were 49/49/50.
The interrupted tick did not change the persisted checkpoint or plan; work
resumed next tick and committed the constrained plan at tick 200, then stayed
idle for the last 20 ticks. The receipt reports both candidates evaluated;
the plan retains 60 extensions and the independently expected six costs.
The existing scenario's code reloads also remain active.

This proves recovery from a real runtime timeout at the candidate-step boundary,
not a cooperative guard or a thrown JavaScript test exception. It does not prove
every possible interruption site or production CPU performance. Native
observed-room completion and default-budget progress have separate scenarios.
The initial engine-XSCaCH run failed only the expected-error wording assertion;
its saved snapshots already showed 49/49/50. The strengthened verifier passed.

Commands: npm run test:engine -- --planning-cpu; npm run quality
(435 production / 380 test files, zero violations). Scenario registered in the
full engine suite; the expanded full suite has not yet been rerun.
