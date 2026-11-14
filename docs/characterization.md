# Legacy characterization evidence

ED-13 characterization foundation is accepted; see characterization-acceptance.md. The fixture excerpts are copied without semantic edits from legacy commit f2bbf7e8c44addc7c426abb5458e393c9502ff5f. Each excerpt records source file, line and SHA-256; tests use synthetic adapter stubs. These are extracted-function executions, not full-game or real-engine validation. Fixtures are checked in so CI does not require access to the legacy repository.

Run `npx vitest run test/characterization test/smoke` for the focused loop.

| Case | Observed legacy result | Intended rewrite behavior | Owner |
|---|---|---|---|
| Same coordinates, different rooms | Equal | Distinct | ED-18 |
| Opposite border coordinates | Equal | Distinct | ED-18 |
| Numeric position overload | Receiver-dependent stub throws TypeError | Preserve receiver and API semantics | ED-18 |
| Three existing extension sites, fourth planned, cap five | No site created | Create fourth when budgets permit; count each site once | ED-27 |
| Standard fits with score 1, constrained scores 100 | Standard chosen without evaluating constrained | Validate candidates, then compare scores; intentional policy change | ED-24 |
| Path search reports incomplete with a nonempty path | Partial path returned as complete road path | Cannot validate connectivity with incomplete search | ED-23/ED-27 |

Remaining ED-13 work: spawn queue priority and manual layout-entry cases; versioned room/memory sample fixtures; broader task and assignment transitions; acceptance review with explicit correction contracts. Representative recipes, geometry, recovery, operator, mining, hauling, threat and all originally listed defect categories now have evidence below. Corrected production behavior must be attached as capabilities land. Do not equate passing legacy characterization with corrected behavior or capability parity.

Additional extracted-function evidence (ED-13): all eight template rotations/reflections; storage-relative normalization and anchor reconstruction; construction sorting by RCL, distance, then priority; road scavenger budget boundaries and carrying capacity; recovery entry below 10k, persistence below 50k, exit at 50k, storage-plus-terminal accounting, RCL eligibility and donor thresholds/distance/order. The refresh function itself is not interval-gated; scheduling cadence requires separate caller characterization.

The extraction utility `node tools/characterization/extract.mjs <legacy-checkout>` verifies the baseline commit and reads committed bytes with git show. Its current manifest covers the added geometry/body/recovery symbols; the original six probe excerpts remain frozen in the same fixture document. Full suite: 32 tests passed in 1.78s; quality passed. No production capability is claimed implemented by these tests.

Operator/mining/hauling evidence: claim parsing validates the first command token and home room, passes Override/AutoExpand options, and removes flags only after queue success. Mining flags persist without visibility, request a scout, and clear their path cache only after successful source registration. Remote-miner reachability reports arrival once or end-of-life failure once, excluding local/mineral miners. Recovery courier tests cover withdrawal, routing, delivery, finishing a loaded trip after recovery ends, returning home and clearing obsolete jobs/path assignments while preserving home ownership. These use synthetic room/creep objects and legacy memory fields, not engine intents. Full suite now 39 tests, 1.85s; quality passes. Threat decisions, remaining registered bugs and broader task/assignment cases remain open.

Threat/cache evidence: old defend.js safe-mode predicate never activates for null, undefined or a hostile object. defenseManager.js activates strictly inside Safe flag range, not at its boundary. Both resourceManager lab-room selectors erase the entire unseen roomCache entry, including unrelated source/layout data. The rewrite must retain that state and represent stale visibility separately (ED-16/ED-36). Safe-mode ownership/availability and engine return codes still need adapter/engine tests. Frozen function expressions retain their bodies; isolated bindings are renamed to avoid duplicate names. Full suite: 48 passed in 1.81s; quality passes.


Isolated predicate evidence: hunter bottom-border condition performs a coordinate assignment even when y is already 49; NaN equality fails to detect NaN; invader-core attackers match the earlier general attacker branch as well as the later specialized predicate. Source inspection establishes their else-if ordering. These are predicate execution/source inspection, not full role/controller execution. Hunter engine setter semantics are deliberately not inferred from a synthetic object. Intended corrections: pure border predicates, explicit finite-number validation, and specialized dispatch precedence (ED-18/ED-21/ED-33).

Latest validation: all 53 tests passed in 1.94s; quality passed. The fixture suite is still incomplete against ED-13 acceptance and is not evidence of rewrite gameplay implementation.

Versioned synthetic room/memory fixture added (room-memory-v1.json), used by queue and manual-build tests. Spawn records retain priority, boost, manual marker, timestamp and specialist memory. Actual processSpawnTasks execution confirms lowest numeric priority is attempted first and an energy shortage retains tasks without trying the next candidate. Manual construction uses flag-position room, preserves string RCL and priority -1000, and leaves capped requests unconsumed. Full suite: 57 passed; quality passes. Acceptance review and explicit correction contracts remain pending.

