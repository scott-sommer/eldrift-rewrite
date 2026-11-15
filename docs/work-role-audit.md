# Worker role reconciliation

Baseline: Eldrift-Directive f2bbf7e8c44addc7c426abb5458e393c9502ff5f. Implementation reviewed through831c948. This is a current checklist; docs/work-acceptance.md and docs/upgrade-rooms.md retain chronological evidence. A checked behavior does not imply whole-module or release completion.

| Legacy entry | Implemented behavior / evidence | Remaining reconciliation |
| --- | --- | --- |
| role.builder.js | Shared construction/repair/upgrade selection, cargo disposal, builder collection profile, Art wall-only exclusions (52e44a5, native engine-pZ1LaS), UpgradeRoom bootstrap harvesting/assigned-source/salvage | Record deliberate selection changes (priority/range ties, rampart target configuration); assignedRoom/CreateRoom/NewSpawn travel, service and renewal belong ED-30 |
| role.wallBuilder.js | Fixed and legacy weighted fortification profiles, energy profile, retained repair batch, validated Art exclusions (c0154de,87ac524) | Characterize idle sleep10 at line143 against shared task retries; final source audit |
| role.upgrader.js | Nearby drops/controller links/storage reserve, automatic source assignment and observed miner deposit endpoints; native disappearance/replacement and unseen-room travel | Memory.goAway at lines10–13 is a real input branch: move toward current-room controller and return without work. No corresponding native adapter observed; ED-39 must preserve a typed parking/pause operation. Hardcoded W3N58 positioning exception needs explicit disposition, not silent equivalence |
| role.upgraderV2.js | Full-load link admission, nearby stores, far-storage fallback, native Transfer hold (831c948), shared cargo recovery and task execution | Per-creep sleep input at lines23–27; two-call recursive job loop is replaced by bounded shared execution, but acceptance must trace observable action ownership rather than preserve recursion |
| role.upgradeMaster.js | Station geometry, sponsored recruitment/travel, shared confirmed service transfers, renewal, low-RCL retained stores and combined reset/rebuild | Per-creep sleep input; explicitly reconcile missing-storage retirement and adjacent-hauler wait with replacement handoff/reservation behavior; do not infer full parity from one successful service run |
| upgradeRoom.js | Stable seven-station rotation, strict TTL thresholds, shared renewal/boost ownership, reserve shutdown, parking, opt-in reset/reclaim, sponsored bootstrap and supply; native upgrade-rebuild | Persisted layout anchors and later specialist integration remain ED-27/31; consolidated source-to-scenario audit still needed |
| room.energy.recovery.js | ED-22 recovery criterion already verified with native emergency economy, donors, support handoff and colony resilience | Legacy memory import/release gates remain ED-44 |

## Inputs discovered beyond registered console commands

A repository-wide search including ignored legacy files found Memory.goAway reads in role.upgrader.js and role.courier.js. No assignment was found by that search. It is an externally writable legacy memory control, not evidence of a registered console setter. Record it under ED-39 and translate deliberately during ED-44 migration; do not automatically import arbitrary legacy root memory.

Sleep is both an input and internal retry mechanism: upgraderV2/master read it, wallBuilder writes10 when idle, distributorV2 and mineralCourierV2 write their own retry values, and energy recovery/spawner clear distributor sleep. The rewrite core has wakeAt sleeping support, but that alone does not prove that these consumers share equivalent wake-up behavior. Audit per-role delay, wake-on-recovery and operator pause semantics separately. An absence of a raw sleep field is not by itself a missing gameplay capability.

## Next actions

1. Reconcile ordinary builder/fortifier target policy and idle scheduling; document deliberate improvements with tests.
2. Reconcile master missing-layout/adjacent-supply cases and tie them to existing native evidence or add missing failure scenarios.
3. Record operator goAway/sleep control acceptance in ED-39 and legacy translation in ED-44. Preserve courier scope too.
4. Complete the seven-role trace with explicit cross-ticket ownership, then run the full native milestone suite before deciding whether ED-22 criterion1 is proven.

Recent targeted validation:590tests/181files in4.59s; quality316production/284testfiles with zero Lizard violations. Last full native aggregate remains140checks; subsequent Art/fortification/source-assignment/Transfer scenarios are registered but no newer full aggregate is claimed here.
