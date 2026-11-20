# Forward startup project finance

ED-29 remains In Progress. `startup/project.ts` runs a chronological forecast coupling funded births, construction, mining/repair, finite stock, home acceptance and dated courier receipts. Earned income can finance later requested workers only after settlement and explicit redistribution. The independently funded static composition remains available.

## Frame and ownership boundaries

The spawn timeline reuses the existing allocator and physical funding model. A frame begins with external expenses and birth admission; it finishes with spawn refills followed by external/earned receipts. Current or future receipts cannot finance earlier admission or transfer. Unique identities and exact observation frames are validated before credited history changes. Final cash is unavailable until the quoted horizon completes.

Station/courier work occurs between those phases. One-frame self-build actions preserve actual source regeneration and construction progress across explicitly born workers. Completed construction becomes available the following frame, then ordinary miner action/repair selection, finite container durability and finite courier trips establish receipts. A due-event queue credits only receipts settling in the current frame. Earlier admissions are never recomputed from future outcomes.

Home income enters bank stock first. Only supplied finite redistribution moves it into spawn-accessible stock. The synthetic funding case starts with300, pays200+100 for the initial crew, receives50 at43 and50 at69, redistributes at70 and admits a further100-energy courier at71 (ready77). Empty bootstrap, inaccessible spawn stock, blocked acceptance and failed infrastructure do not generate financing.

Forward-model `spawning.cash` includes settled earned events. Top-level `cash` also applies construction-readiness recovery rules. Births are charged once; remotely supplied construction/repair is not debited again from home capital. Source, cargo, overflow, repair consumption, expired cargo and unrecovered container stock remain explicit in conservation. Initial capital is excluded from profit.

## Calibrated ready-state lifetime

The reusable `spawning/lifetime.ts` derives standard first-ready active life1499 and CLAIM life599. The SHA-bound clean native source1bb16a7 trace confirms full continuous lives and body spawn durations: miner admitted22, ready43, last alive1541/TTL1, absent1542; courier admitted1283, ready1295, last2793/TTL1, absent2794; reserver admitted1307, ready1319, last1917/TTL1, absent1918.

Source/courier projections now subtract travel/retirement from that first-ready interval, removing one previously overcounted action. Synthetic short-window retirement inputs were adjusted to retain their intended durations. The separate economics API's nominal lifetime input and ordinary runtime's observed-TTL policy are unchanged. This is pinned archival calibration, not qualification of future native route/authority binding.

## Cooperative bounded computation

`forecastStartupProject(input)` completes a finite horizon. `createStartupProject(input)` supports `advance(maximumFrames, guard)` with final-only `result()`. Budgets0..10001, monotonic frames and existing finite request/worker/flow/horizon bounds constrain work. A false guard advances nothing. Detached snapshots preserve quoted source, bodies, policy, sink and names across batches. Tests mutate the caller input after a guarded batch and verify the same final result as uninterrupted execution.

The simulation adds no Game globals, native effects, persistence namespace or stock owner. In-process progress is not yet serialized through global resets. Operational planning still needs quote identity/freshness, feature-owned durable metadata, reset/restart handling and measured CPU admission. Bounded calls alone do not qualify native CPU affordability.

## Checks and remaining scope

Nine project behaviors cover funded-static parity, settled-income births, spawn accessibility, bootstrap deadlock, sink rejection, detached resumption, earned-income-funded successors, infrastructure failure and unsupported overlap refusal. Two timeline contracts verify same-frame ordering and rejection of future/duplicate/wrong-phase receipts without partial credit. Archival calibration additionally verifies first-ready lifetime and spawn offsets.

Ordinary units1,644/422 files11.36s; controlled processor checks4/1 file210ms. Typecheck, lint, boundaries, CommonJS and Lizard pass (772 production/624 test files, zero violations). A focused seven-file set passed49 tests318ms before lifetime refinement; the later lifetime-focused set passed43 tests396ms. Gameplay SHA-256 remains `2f84cee435e77f1801a46ca86357bf85e228064838661104cd5ee1e836c59cd1`, identical to prior clean native source08afcf2. No new full-server scenario/registry case was run;233-case full rerun remains pending. Hosted checks follow the source commit.

The model still requires explicitly supplied finite requests, refill schedules, safe routes and one source/container/home endpoint. It does not generate all future demand, prove distributor trips, renew authority, handle overlapping station handoffs or move between alternate sinks. Ordinary selection/recruitment does not call it yet. Native binding/courier timing, persistent budgeted planning, configurable whole-project candidate evaluation and broader operational/parity requirements remain open.
