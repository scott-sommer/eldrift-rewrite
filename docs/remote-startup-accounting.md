# Streaming startup accounting

ED-29 remains In Progress. Forward project accounting now runs within the same guarded frames as station/courier simulation. `result()` no longer replays the financial horizon or sorts the whole receipt history. This removes a specific unbudgeted completion step; native CPU/memory qualification and operational planning integration remain open.

## Statistical owner and frame protocol

`cash-ledger.ts` owns statistical cash counters only. Physical bank/spawn stock and claims still belong to the existing funding owner. The ledger accepts one validated frame in order, debits categorized costs before receipts, records the post-debit minimum, and evaluates recovery against current readiness. It keeps scalar totals and returns a completed summary only after the horizon. Invalid frame effects or unsafe arithmetic cannot partly mutate its counters. The synchronous `forecastStartupCash` convenience API uses these same rules; it remains synchronous and is not itself a cooperative planner.

The spawn timeline records each frame's external flows and actual admitted births, then applies earned/known receipts once. Its cash result is now already accumulated. The project separately accumulates household cash with construction-readiness gating and source-only return without external delivery income. These are analysis counters, not extra reservations or money owners. A positive early household balance does not create a later recovery date if costs make it negative before infrastructure becomes ready.

Future courier receipts enter the due-event queue. Settlement sorts only that frame's bounded courier group and appends the settled history chronologically. Emitted future events are drained each frame; their appearance cannot finance an earlier birth. Final output hands over the accumulated history and copies only bounded request/birth/flow metadata. It performs no horizon-length receipt index, financial scan or history sort. `advance` reports `accountedThrough` alongside simulated progress.

The current finite catalog bounds frame work, receipt identities and history. Guard pauses and detached-input resumption retain their existing semantics. Native use still needs measured admission budgets, global-reset handling and compact persistence rather than assuming large debug histories belong in Memory.

## Behavioral checks

Three ledger cases verify exact cost-before-credit minima, readiness, categorized deficits and transactional rejection of invalid/unsafe effects. Two project regressions cover receipts emitted in a different order from settlement and recovery that disappears before construction becomes ready. In the delayed case, receipts settle69/92/95 and the next body starts94; an earlier action emitting the92 receipt cannot fund that body in advance. Existing static composition, native-data calibration and earned-income/cargo conservation checks pass unchanged.

Full ordinary units1,650/423 files13.86s; controlled processor comparisons4/1 file359ms. Focused accounting/project/timeline/cash/native-data calibration plus broad smoke32 tests/6 files359ms. Typecheck, lint, boundaries, CommonJS and Lizard pass (773 production/626 test files, zero violations). The suite-report failure/partial-evidence contract also passes (one Node test148.725ms).

## Fast real-engine guards

The new registered `--remote-startup-admission` case runs150 ordinary main-loop ticks without prebuilt remote container, seeded witness/workforce or stale-request injection. It must discover/select, fund one miner, become active remotely and advance container construction while couriers/reservers remain staged. Current home stock plus home cargo and all paid births must conserve initial capital; unrelated state and two global reloads must survive. This is early admission/warmup qualification, not complete construction/payback or full forecast-native timing.

The existing150-tick protected refusal case remains the independent negative gate. Both short cases now have a120-second child timeout; the measured5,000-tick staged milestone keeps its separate25-minute allowance. The registry contains234 cases; the full234-case suite has not been rerun. Clean sourcefb5c297 passes all three serial guards in24.917s. Positive admission takes14.438s; at150 ticks it records376 construction energy,750 paid birth energy,9550 home stock,zero source income and one active mining claim. Protected refusal and packaged smoke also pass. The two150-row traces, clean reload provenance and exact results are indexed in [accounting evidence](evidence/remote-startup-streamed-accounting.json). These short checks support routine shared-cash changes without repeatedly invoking the costly full startup milestone.

Native project binding, persistent planning/reset recovery, alternate service/handoff strategies, whole-project candidate policy and wider parity/pressure gates remain open. Ordinary selection still does not call the portable forward project simulator.
