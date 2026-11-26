# External configured-pipeline history

Harness source:81f2e79. The explicit `--external-pipeline-telemetry` flag is accepted only with a configured pipeline scenario. Between completed native ticks, the runner drains only fixture-owned pipelineRows and calibration frames/events into its own process. It reconstructs every observation before invoking the existing, unchanged exact verifiers. Production state, configuration, cumulative receipts/income, births and frozen quote/input/result remain in bot Memory.

The collector rejects gaps, duplicates, changed/disappeared proofs, missing rows and bounded tick/array overflow. It preserves collected history, frozen proof, per-tick before/after Memory sizes and failed captures in raw evidence, including partial runs. Reloads remain real VM reloads; no observation is replaced by a fabricated receipt or acknowledgment.

## Local checks

Four collector checks and the existing suite-report check pass together in214.7ms. One check reconstructs all1,000 rows and every frame/event from the previously passing native archive, runs the unchanged exact calibration verifier, and proves an altered receipt still fails. Other checks compare every non-history field across collection/serialization, reject invalid progress/proofs and preserve failed captures. CI and the full engine-suite entry point include these lightweight harness checks. Fixed smoke76/15 passed522ms; quality (1042 production/898 test files, zero violations) and CommonJS bundle passed. Full units and full milestone CI were not run.

## Source-qualified native comparison

[Two raw archives](evidence/startup-external-telemetry.json) retain one pass and one failure. The old in-Memory history baselines remain in startup-identical-booking.md. Supported old/new runs have identical bot bundle hash acc1d6ca51541dd53e477581e679b67c7fb889d7b44dea6cc0705d166b68c37c; budget old/new runs share904a53d18161952f64db574c92d49116edc75ade877bd5d841c7866728bd04bd. This is an observation-storage comparison, not a production behavior change.

Supported configured1,000 ticks PASS: all61 receipt frames/amounts,3528 delivered,3752 harvested and88 repair match. First income110 and the existing withdrawal/cleanup/capital checks pass. The collector preserves1,000 rows,745 calibration frames and680 action events (1,580,131 external bytes). Final engine-visible Memory before draining is154,291 bytes; after draining153,067, peak after-drain156,030. This is distinct from the older1.7MB fixture pressure case.

Untraced5ms configured1,000 ticks FAILED exact receipts. First observation35 approved81; births135/156/168, activations156/168/180 and firstharvest166/income183 match, as does88 repair. Harvest3256 differs from3264, delivery2496 differs from3080, and42 actual receipt frames differ from53 predicted. The first difference is amount56 rather than62 at tick262. All1,000 rows,722 frames and571 events are retained externally (1,564,185 bytes); peak after-drain Memory174,945. No collector failure occurred. Removing growing history alone therefore does not solve the5ms service gate.

## Running and interpreting it

Use `node tools/engine/smoke.cjs --remote-pipeline-configured --external-pipeline-telemetry` or the corresponding `--remote-pipeline-configured-budget` flag after building. Run native cases serially on clean committed source. Samples still measure actual engine-visible Memory, while pipelineTelemetry records external history and after-drain sizes. The default old mode is unchanged and remains available as an explicit observation-pressure comparison. Neither mode substitutes for production aggregate-home pressure/soak qualification in ED-43.

Next diagnose the full horizon with a bounded refusal-only trace, rather than collecting every successful phase in an early window: preserve denied transport stage and miner yield/deferred tick across the whole campaign with low observation volume, and correlate the first native missed action against model events. Keep this instrumented diagnosis separate from untraced qualification. Future schedules, shared capital, replacement and home-loss integration remain open; ED-29 and the full specialist/operator/parity/migration/RC scope remain incomplete.
