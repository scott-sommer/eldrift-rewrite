# Worker role reconciliation

Baseline: Eldrift-Directive f2bbf7e8c44addc7c426abb5458e393c9502ff5f. Implementation reviewed through831c948. This is a current checklist; docs/work-acceptance.md and docs/upgrade-rooms.md retain chronological evidence. A checked behavior does not imply whole-module or release completion.

| Legacy entry | Implemented behavior / evidence | Remaining reconciliation |
| --- | --- | --- |
| role.builder.js | Shared construction/repair/upgrade selection, cargo disposal, builder collection profile, Art wall-only exclusions (52e44a5, native engine-pZ1LaS), UpgradeRoom bootstrap harvesting/assigned-source/salvage | Weak-wall half-target tier restored; target/idle policy dispositions below; assignedRoom/CreateRoom/NewSpawn travel, service and renewal belong ED-30 |
| role.wallBuilder.js | Fixed and legacy weighted fortification profiles, energy profile, retained repair batch, validated Art exclusions (c0154de,87ac524) | Characterize idle sleep10 at line143 against shared task retries; final source audit |
| role.upgrader.js | Nearby drops/controller links/storage reserve, automatic source assignment and observed miner deposit endpoints; native disappearance/replacement and unseen-room travel | Memory.goAway at lines10â€“13 is a real input branch: move toward current-room controller and return without work. No corresponding native adapter observed; ED-39 must preserve a typed parking/pause operation. Hardcoded W3N58 positioning exception needs explicit disposition, not silent equivalence |
| role.upgraderV2.js | Full-load link admission, nearby stores, far-storage fallback, native Transfer hold (831c948), shared cargo recovery and task execution | Per-creep sleep input at lines23â€“27; two-call recursive job loop is replaced by bounded shared execution, but acceptance must trace observable action ownership rather than preserve recursion |
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

## Builder and fortifier target-policy disposition

Legacy builder evaluates construction, ramparts, then walls below half target before walls below full target, then upgrading below RCL8. The restored builder wall tiers use strict hits < target/2; healthier walls cannot win through proximity or retained-target preference. Equality belongs to the upper tier. Unit regression uses a far24999-hit wall versus an adjacent25000-hit wall at target50000, then checks equality and completion.

Within a tier the rewrite uses configured distance weighting and deterministic ID ties rather than engine enumeration order. Shared critical-structure/downgrade priorities and dependency-ready construction remain explicit improvements required by ED-22. Ramparts still precede walls. Target hits are capped to actual maximum, correcting legacy's failure to admit walls when maximum equals the configured target.

workerRampartHits is the effective repair target. Legacy builderRampartHits override had an implicit minus3000 offset; ED-44 translation must map max(0, legacy value-3000), preserving absence as default50000. workerWallHits maps the effective wallHits value directly. Native production does not read those legacy fields automatically.

The legacy wallBuilder sleep10 occurs only when no eligible barrier remains at RCL8. The rewrite reevaluates observed work each tick, allowing newly damaged barriers or construction to be selected immediately. This deliberately removes an internal idle delay, not an externally requested pause capability. CPU cost belongs to the later measured performance gate; no savings are assumed. Raw sleep/operator pause remains separately tracked.

Validation:591tests/181files pass4.68s; quality316production/284testfiles, zero Lizard violations. Native Art-builder action regression engine-kKR1VE passes. The half-target ordering itself is proven by the selector boundary test; this native regression does not contain two competing walls. Full suite not rerun. Master failure-path reconciliation is the next role-audit item.

## Master lab loss and replacement evidence

Added --master-layout-loss to the pinned native suite. It runs production main with the normal automatically recruited master, removes its lab after tick80 while it carries200XGH2O, and creates a replacement lab with a new identity after tick90. The replacement contains100GH as an observable new service demand; creep cargo is never injected.

At observations81–90 the same master remains at22,21 with200boost mineral and loses exactly9TTL across those observations: missing layout suspends renewal and service rather than issuing actions against stale endpoints. After replacement, shared cargo recovery returns200XGH2O to the terminal's existing300, giving500. Native service clears replacement GH100 into the terminal, producing140GH total including the earlier40. Final cargo is0; ordinary courier cargo stays0 and population never exceeds the original local courier plus one master.

Final evidence engine-htd3xD; normal --upgrade-master regression engine-thB6UZ also passes. Quality316production/284testfiles passes with zero Lizard violations. Production behavior was unchanged; the last unit result remains591tests/181files. No full native aggregate rerun. The new scenario verifies a temporary missing lab with cargo and native replacement; it does not prove missing-storage retirement, permanent layout loss or all adjacent-hauler contention cases.

## Empty low-RCL master retirement

Legacy role.upgradeMaster.js72 suicides an empty stationed master when the assigned room is belowRCL6 and storage is missing. The rewrite now preserves that retirement trigger but reassigns the empty unit to ordinary hauling instead of destroying it. This deliberately retains its useful body. Settlement still runs before the decision; task/receipt/reservation state is retained under the same hauling schema and identity. No task purge, invented receipt or cargo drop occurs. The ordinary hauling executor owns subsequent actions.

Native --master-storage-loss recruits and operates a master, then removes storage and sets RCL2 after tick100. At tick100 master cargo is0; tick101 the same named unit has ordinary logistics ownership. It remains alive and handed off through120, with population exactly2 and no replacement master. Evidence engine-vBeF87. This verifies handoff, not a subsequent hauling delivery. An initial assertion used an unserialized owner string; corrected to the actual logistics identity format before the passing run.

Loaded temporary-layout-loss regression engine-AAPbfq passes, retaining200XGH2O during lab absence and recovering it after replacement. All591tests/181files pass4.78s; quality316production/284testfiles zero Lizard violations. New case registered; full aggregate not rerun. Permanent missing layout while carrying cargo remains a separate limitation; the empty low-RCL retirement branch does not claim to solve it.

## Loaded low-RCL master handoff and inactive receiving endpoints

The storage-loss handoff now applies to loaded masters too. This corrects indefinite stationary cargo retention when storage disappears belowRCL6. Same-unit hauling state is retained; previous intents settle before ownership changes. This supersedes the empty-only limitation above for this specific trigger, not arbitrary permanent layout loss.

Native --master-loaded-loss removes storage and lowers RCL after tick80 while a native mineral withdrawal is in flight. Tick80 observes empty cargo; tick81 observes200XGH2O and ordinary logistics ownership. The first run exposed inactive lab/terminal receiving capacity being advertised after the RCL drop, which left cargo stuck. Shared hauling observations now report zero receiving capacity for inactive structures, while retained stock remains collectible. Cargo recovery excludes inactive sinks. The ordinary task lifecycle releases the invalid destination and recovers through a new request, rather than crediting the original delivery.

The fixture adds an active adjacent container as a recovery destination. Final engine-DRge3F: container200XGH2O, terminal300, lab1000, master0; total1500 equals initial mineral stock. Same master survives, no replacement recruitment. Empty-handoff regression engine-vM7uHn, temporary lab-loss/replacement engine-IKANA7 and low-RCL inactive-source bootstrap engine-4rZDmj pass. Unit boundary test explicitly distinguishes collectible inactive stock from unavailable receiving capacity. All592tests/181files pass4.89s. Quality316production/284testfiles passed before the final added boundary test; final quality is recorded with the commit. Full aggregate remains pending.
