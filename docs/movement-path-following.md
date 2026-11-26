# Complete-path following and routing deferral

Path-following source fdb4d20 adds a bounded, disposable per-unit complete-path remainder to Navigator. The exact-origin search cache remains responsible for searches. Every movement step still prepares a current request; following compares canonical destination/range, profile/search limits, topology/policy versions, allowed rooms and origin room. Confirmed position along the path selects the next point. Unexpected displacement, context changes, expiry, congestion detours or missing results fall back to search. Incomplete/failed/empty/oversized paths are not retained. Returned points and stored paths are detached.

Defaults retain at most200 units,25ticks and250steps per path; constructor injection permits alternate bounds. The cache is heap-only and disposable on VM reset. It stores geometry rather than costs or authority, introduces no persistent namespace, and does not bypass current native movement legality or traffic arbitration. Portable tests show one search across three advancing positions while preparing current context three times. This does not establish native aggregate performance or cold-reset retention.

Source2881a0b separately corrects a reproduced trip-lifecycle bug. Collection routing could exhaust its CPU guard and return undefined, causing prepareCollection to cancel an admitted request/task as if the route were invalid. It now preserves the task/request/actual booked quantities on CPU deferral. With available budget, genuine unsafe-room refusal still cancels, releases claims and retreats. A regression failed against the old code (cancelled request and empty queue), then passed. The final regression uses real submitHaulingTask admission and quantity booking, asserting byte-identical state and no dispatch for deferral, and released booking plus retreat for danger.

## Incremental checks

Initial movement contracts23tests/eight files passed431ms. The final combined targeted set25tests/six files passed764ms, fixed smoke76/15 passed569ms, quality passed (1044 production/900 test files, zero violations), and CommonJS bundle passed. Normal congestion, partial routes, arrival, mobility and cross-room transition contracts remain tested. Full units, full native registry and milestone CI were not run.

## Native outcomes on2881a0b

[Nine clean-source raw archives and the100-row diagnostic](evidence/startup-path-following.json) preserve seven passes and two failures. Native paths, traffic, exits, occupied exit, fleet border and ordinary transport pass. Supported configured1000 passes all61 receipt frames/amounts,3752harvest/3528delivery/88repair and existing birth, withdrawal, cleanup and capital checks.

Instrumented5ms1000 FAILED first receipt timing: observation35, firstharvest166 matches, income184 differs from183. Harvest3256 differs from3264; delivery3080 matches, but52 actual receipt frames differ from53. Cold refusals remain, including source denial591 and execution refusal311; do not infer a native speedup from the portable search-count test.

Untraced5ms1000 also FAILED exact calendar, despite matching harvest3264,delivery3080,repair88, firstharvest166/income183 and53receipt frames. Exact frame/amount comparison remains mandatory. Equal totals or counts do not close that gate.

## Next measured work

Measure native path searches and matrix-observation counts before adding more caching. Current matrix snapshots are private to each createMatrixSnapshots factory and reset every tick; multiple movement/startup consumers can prepare the same native room facts independently. Any sharing must remain limited to immutable Game facts in the current tick, clone mutable matrices for callers, preserve per-mover occupancy variants and constructor injection, and never cache live lease/financial/quantity authority. Distinguish portable reuse guarantees, native counts and actual CPU improvement. The5ms execution gate, broader schedules/shared capital/replacement/home-loss and all downstream parity/pressure/migration/RC obligations remain open.
