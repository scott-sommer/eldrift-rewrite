# Persistence capacity baseline

Run `node tools/memory-profile.mjs` from the primary checkout after `npm ci`. The command compiles the fixture with the pinned esbuild, constructs records through the actual Memory adapter and schema validators, verifies sizes independently with Node Buffer, checks that measurement does not mutate state, and writes artifacts/memory-profile.json. The checked-in report in evidence/memory-profile.json preserves the first measured baseline, including all samples, source-bundle hash, Git state, Node version and platform.

| Synthetic rooms | Creeps | Queued tasks | Plan entries | UTF-8 bytes | Warm median ms | Warm max ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 20 | 60 | 150 | 25,544 | 0.603 | 0.977 |
| 5 | 100 | 300 | 750 | 126,516 | 2.491 | 2.716 |
| 20 | 400 | 1,200 | 3,000 | 508,261 | 11.054 | 12.701 |

Each room also has 100 structure IDs, two source IDs, a colony record, one mission stage and 20 exclusive claims. Operator settings and the complete identity roster are included. Every record passes its current schema. The plan is a serialization fixture, not a valid architectural layout or terrain assessment; task definitions and mission contracts are fixture-only. ASCII fixture code-unit and byte totals coincide; separate Unicode tests verify that the diagnostic distinguishes them.

Each case records one cold and ten warm measurements. Timing includes plain-data validation, JSON copying and final stringify, but excludes fixture construction and UTF-8 counting. These are local host wall durations, not Game.cpu or the engine's implicit Memory parse/serialization costs. Namespace totals count envelope values only; full totals also include keys and root framing. Timing thresholds are not unit-test assertions.

These fixtures exercise the currently available schemas at several scales. They are not a representative live empire, a full feature-state estimate, or a memory-leak/soak test. Future path caches, industry state, historical metrics, retained legacy state and other unfinished features may materially change the result. ED-43 must rerun measurements on actual feature-complete scenarios and record engine CPU, warm/reset behavior and growth over time.

Decision: retain ordinary Memory for current durable records and bounded reconstructible runtime caches. Do not run full-state diagnostics each tick. Defer RawMemory segments until real engine/soak evidence identifies a concrete size or CPU problem and an access pattern suitable for segmented storage. Segment adoption requires explicit loading/unavailable/reset behavior and migration tests, rather than simply moving this entire root. Large snapshots can hit copyPlain's validation-node budget; diagnostic failures must be reported as unavailable measurements, never interpreted as empty data or permission to discard state.
