# Next ED-29 implementation boundaries (source audit, not qualification)

Baseline: legacy f2bbf7e8c44addc7c426abb5458e393c9502ff5f; rewrite timing component 29d3cfd. No source changes were made while its full clean-commit suite ran.

## Road execution

Legacy role.minerV2.js building() (around lines 207-232) builds sites in range 3 during source downtime and otherwise repairs the dump container. utilV2.js repairThings() (around 2770-2828) retains nearby build/repair targets and throttles reselection by bucket. These are opportunistic, local behaviors; they do not prove a recruited worker can service a whole remote road.

Rewrite infrastructure planning compiles per-room road/container entries from complete source routes. Execution places sites under assignment generation and route authority, sharing the owned/remote construction ledger. Native work execution already owns action arbitration and movement, but currently embeds an owned-work route policy. WorkTaskPayload also assumes order.position.room === home. Do not weaken either invariant globally to make remote work fit.

Use a narrow injected movement-policy port on the shared native work adapter, retaining the existing default for owned workers. A separate remote outpost work behavior should validate current assignment/generation and admitted route before every selection/action, select only planned matching road/container sites, and carry explicit home/target identity. Reuse workStep, task runner, population demand, quantity-booked collection and banking; do not create a second intent or transfer-credit system. Distinguish worker construction energy from confirmed remote income. Release/cancel only that owner's tasks, queue work and reservations when authority is withdrawn. Persistent recruitment demand and active service should have separate owners/modules, as miner/courier fleet does.

Qualify actual road completion away from the mining station, energy consumption, reload, threat/lease withdrawal, loaded return, unrelated queue/state preservation and bounded work. Road site creation alone remains incomplete.

## Longer loaded retirement

The clean milestone's assessment test checks native PathFinder quotation on a farther source, while its lifetime fixture verifies a short route. Add a controlled initially-aged, fully loaded miner on a forced longer/swamp route: no mid-run TTL or energy injection, publish measured fleet profile, observe automatic retirement at its measured reserve, confirm all cargo physically banked and journal settled before natural expiry. Record initial conditions and distinguish this from natural recruitment/replacement. Follow with contended queue/handoff qualification rather than generalizing one return proof.

## Still open

Buffered automatic reservation/controller travel, startup funding/payback and home redistribution, 1500-tick adaptive load including energy starvation, per-home full-life reachability, alternate-home recovery, combined scout-discovery-workers and ED-43 pressure. No whole-remote parity or RC claim follows from the timing component.

## Work foundation status

Clean ccc4843 implements the narrow per-call NativeWorkPolicy injection on shared intent execution. An unavailable policy blocks both movement and already-in-range work before consuming action ownership. Existing callers retain their owned-work route. The pure remote infrastructure selector restricts orders to owned, ready, incomplete sites at exact current-plan type/coordinates, admitted route rooms, enabled infrastructure types and matching home/target/generation/expiry. Containers precede roads; same-priority retained targets remain stable. Caller must still resolve current lease authority.

Full units pass: 1,381 tests / 376 files / 11.64s. Focused adapter/selector/position/smoke checks pass (17 tests / 278ms); type/lint/boundaries and Lizard pass (655 production / 547 test files, zero violations). Clean native work, worker-position, worker-position-wide and remote-return scenarios pass; provenance is in evidence/remote-work-authority-native.json. These native checks protect existing behavior; remote service, collection, retirement and recruitment are the next integration work. No automatic road execution claim is made.

The longer loaded-return item above now has a focused controlled-retirement proof at 947ac1f/b35af7c; see evidence/remote-swamp-return-native.json. Long-route natural replacement overlap and contention remain separate open requirements.
