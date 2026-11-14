# ED-13 acceptance review

Accepted as a characterization foundation, not production parity. Baseline: f2bbf7e8c44addc7c426abb5458e393c9502ff5f. Synthetic inputs contain no live-account data. All paths below are relative to the repository.

| Acceptance requirement | Evidence |
|---|---|
| Spawn priorities and body recipes | test/characterization/queue-build.test.mjs executes processSpawnTasks; layout-spawn.test.mjs exercises body budgets and carry capacity |
| Task transitions and mining/hauling assignments | operator-mining.test.mjs executes reachability memory transitions; courier.test.mjs executes withdrawal, travel, delivery and support completion/assignment cleanup |
| Layout transforms and manual entries | layout-spawn.test.mjs tests eight transforms; queue-build.test.mjs tests manual flag location, RCL, metadata and structure cap |
| Threat decisions | threat-cache.test.mjs compares both safe-mode predicates and strict range boundary |
| Recovery hysteresis | recovery.test.mjs exercises entry/exit boundaries, donor selection and eligibility |
| Operator parsing | operator-mining.test.mjs exercises claim syntax/options and mining flag lifecycle |
| All nine original defect categories | legacy-regressions.test.mjs (positions/receiver/sites/path), conditions.test.mjs (assignment/NaN/dispatch), threat-cache.test.mjs (visibility/cache) |
| Evidence classification | excerpts.json, conditions.json and characterization.md explicitly distinguish extracted-function execution, predicate execution and source inspection; no real-engine claim |
| Versioned room/memory and provenance | test/fixtures/legacy/room-memory-v1.json schemaVersion 1; fixtures retain baseline SHA and excerpt provenance |
| Intentional deviations | docs/regressions.md and correction-contracts.json retain expected corrections and implementation owners |

Validation at local commit 1ae774c: npm test passed 57 tests in 2.09s; npm run quality passed. No production changes in this acceptance review. Current tests are representative contracts, not exhaustive feature coverage. There is no full legacy Game emulation. Dispatch chain ordering additionally relies on source inspection. Engine validation belongs to ED-14 and feature/release scenarios. Actual fixes are required in their owning implementation tasks and ED-42 parity closure; none are declared implemented here. Remote publication and CI execution remain pending authorized Git transport.
