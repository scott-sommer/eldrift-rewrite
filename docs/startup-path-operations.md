# Native path and room operation measurements

ED-29 remains open. Source af3a5eb measures diagnostic SDK operations without changing the production adapters. The diagnostic build injects pathProbeSearch at direct PathFinder.search references; it calls the real frozen SDK with unchanged arguments and returns its exact result. Room.prototype.find is wrapped only around runtime execution and restored in finally. Aggregation is bounded to256 actor/operation/window keys, with dropped calls counted; the run retained92 keys and dropped none. Reload windows are311,591,861. Other calls aggregate over normal frames.

The two initial native failures revealed that both PathFinder.search and its global reference are protected. Their clean-source archives are retained. Tests now use a frozen SDK fixture. The working injection leaves the SDK/global untouched. Instrumentation is opt-in and is absent from ordinary bundles; it is not a production architecture dependency.

## Results

[Four raw archives](evidence/startup-path-operations.json) retain both SDK restriction failures, the measured1000-tick campaign and the same-source untraced1000-tick control. Both completed campaigns use external passive fixture telemetry and the unchanged exact calendar verifier.

| Campaign | Outcome | Harvest | Delivery | Receipt frames |
| --- | --- | --- | --- | --- |
| Measured engine-wgVfFd | FAILED exact timing |3264/3264|3080/3080|53/53|
| Untraced engine-MCCsJP | FAILED exact timing and later amounts |3264/3264|2302/3080|40/53|

Measured first mining166 and first income183 match; the first differing receipt is315 rather than313. Control first mining165/income182 match its own observation34 forecast; the first differing receipt is56energy at262 rather than62 at261. Observation epochs differ, so absolute birth calendars must be compared to each run's own forecast. No speedup or repeatable performance qualification follows from these two samples.

Measured calls include554 direct native path searches and69499 Room.find calls. SDK search inclusive duration totals115.35ms across1000ticks. The three reload windows measure total SDK call intervals1.1154ms,0.9247ms,1.1991ms. These are not total tick/role durations: the311 miner role interval alone is5.8476ms after1.5431ms preparation, and591 courier execution is denied after3.3131ms of role work following1.3129ms preparation. Search duration may include nested Room.find callbacks, so durations cannot be summed as exclusive CPU.

Path searches are injected across the diagnostic bundle, including any fixture-side direct calls; Room.find is measured only around runtime execution. Background is a lifecycle attribution bucket, not a guarantee that an operation belongs to a specific feature. Aggregates contain no room or per-tick duplicate identity. They do not prove that all repeated calls are redundant, nor measure matrix creation, cell sorting or revision serialization. Instrumentation itself changes budget consumption and cannot qualify an untraced service envelope.

## Checks and next boundary

Targeted probe/transport contracts7tests/two files passed271ms; fixed smoke76/15 passed468ms. Subsequent typecheck, lint, architecture and pinned Lizard checks pass with1044 production/902 test files and zero violations; bundle loading passes. A final probe-only run3tests passed203ms and smoke76/15 passed573ms on the earlier facade checkpoint. Full units and milestone CI were not run.

Before changing matrix caching, add bounded diagnostic timing at matrix observation/preparation boundaries and record room/tick duplication. Preserve factory injection, mutable matrix cloning, mover occupancy isolation, fresh per-tick Game facts and all live authority checks. These measurements rule out attributing the whole cold stall to native SDK search/find intervals alone. The5ms calendar, wider schedules/shared capital/replacement/home-loss and downstream feature/RC gates remain unqualified.
