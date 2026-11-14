# ED-15 runtime acceptance

Implemented at b0154ee, with production wiring introduced at 0e0834c. This accepts the runtime framework only; no gameplay capability or real-engine performance claim follows.

| Criterion | Implementation and evidence |
|---|---|
| Explicit composition and dependency direction | main.ts, app/game-loop.ts, app/runtime.ts; boundary checker passes for all 16 source files. Core scheduling imports only core contracts. No service locator. |
| Six configuration layers and provenance | config/resolve.ts, provider.ts and validation.ts; config tests cover zero/false, ranges, invalid/unknown fields, profiles, temporary expiry, per-room isolation and winning source. |
| Shared tick observations and diplomacy | world/observe.ts plus adapters/screeps/observations.ts index owned rooms, normal/power units, structures and potential threats; configured allies are excluded. Runtime caches completed ticks. Tests verify scan counts, copied metadata and loss of visibility. |
| Failure isolation and scheduling | core/scheduling and app/game-loop preserve original errors and room/work context; tests cover feature/sink/room failures, urgent precedence, bucket and hard CPU gates, deterministic phases, overdue fairness and dynamic room changes. |
| Invalid config, multiple rooms, starvation, failures | test/config, test/world, test/adapters, test/core and test/app execute these cases. |

Validation: 85 tests passed in 1.84s; type/lint/boundary/Lizard checks passed; packaged CommonJS loop and source maps passed a synthetic Game check. All production functions/files satisfy pinned Lizard limits without exceptions. Tests do not establish actual engine behavior, CPU cost or release parity.

Operational boundaries: observation work scales with visible entities and retains only narrow metadata, not the full serialized world. Scheduler admission is cooperative; feature handlers must bound their own work. Fairness assumes capacity is eventually available after urgent work. Same-tick configuration changes take effect next tick. Main supplies defaults until persistence/operator configuration is connected in ED-16/ED-39. Feature registration remains intentionally empty until capability implementation. ED-12 remote CI evidence remains open; the same local quality gates were used throughout. Remote publishing remains pending authorized transport.
