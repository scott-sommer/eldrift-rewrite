# Worker role reconciliation

Baseline: Eldrift-Directive f2bbf7e8c44addc7c426abb5458e393c9502ff5f. Functional review updated through5145a27; consolidated ownership is in docs/worker-role-acceptance.md. This is a current checklist; docs/work-acceptance.md and docs/upgrade-rooms.md retain chronological evidence. A checked behavior does not imply whole-module or release completion.

| Legacy entry | Implemented behavior / evidence | Remaining reconciliation |
| --- | --- | --- |
| role.builder.js | Shared construction/repair/upgrade selection, cargo disposal, builder collection profile, Art wall-only exclusions (52e44a5, native engine-pZ1LaS), UpgradeRoom bootstrap harvesting/assigned-source/salvage | Weak-wall half-target tier restored; target/idle policy dispositions below; assignedRoom/CreateRoom/NewSpawn travel, service and renewal belong ED-30 |
| role.wallBuilder.js | Fixed and legacy weighted fortification profiles, energy profile, retained repair batch, validated Art exclusions (c0154de,87ac524) | Internal idle-delay correction is documented below; explicit operator pauses remain ED-39/44 |
| role.upgrader.js | Nearby drops/controller links/storage reserve, automatic source assignment and observed miner deposit endpoints; native disappearance/replacement and unseen-room travel | Memory.goAway at lines10â€“13 is a real input branch: move toward current-room controller and return without work. No corresponding native adapter observed; ED-39 must preserve a typed parking/pause operation. Configurable approach distance now replaces the hardcoded exception; native evidence and ED-44 translation ownership are below |
| role.upgraderV2.js | Full-load link admission, nearby stores, far-storage fallback, native Transfer hold (831c948), shared cargo recovery and task execution | Per-creep sleep input at lines23â€“27; two-call recursive job loop is replaced by bounded shared execution, but acceptance must trace observable action ownership rather than preserve recursion |
| role.upgradeMaster.js | Station geometry, sponsored recruitment/travel, shared confirmed service transfers, renewal, low-RCL retained stores and combined reset/rebuild | Sleep control remains ED-39/44; loaded/empty missing-storage handoff and route-specific adjacent-supplier wait are now natively exercised below |
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

## Full native milestone regression after374a549

Pinned suite passes149checks in383.71s, including both expected-failure detectors. Additional inspection of every nonnegative evidence file found no errors and no console messages containing Error:. artifacts/engine-suite.json indexes exact scenario evidence. Refreshed examples: loaded master recovery engine-QeRe4h, reset/reclaim/rebuild engine-n0XZ5R, colony resilience engine-EfyyZ5.

This run began at374a549. During execution, ED-23 added unconnected pure geometry modules in00f7386; those have separate595-test/quality evidence and are not claimed covered by this engine bundle. No runtime code changed during the aggregate run. ED-22 role audit and later operator/migration/layout/release requirements remain explicit; passing the aggregate does not close those requirements.


## Control and positioning acceptance reconciliation

Source reinspection at runtime commit8e56274 confirms upgraderV2 and master sleep branches decrement a truthy value and return before any role work. Positive integer N skips N role invocations; zero bypasses the branch. A negative value is truthy and is cleared after one skipped invocation. A fractional positive value can cross below zero. The new typed interface must validate durations and test exact tick semantics rather than perpetuate these accidental coercions. Bounded task transitions and wakeAt do not implement these external controls by themselves.

ED-39 now explicitly owns typed goAway parking (ordinary upgrader and separately audited courier), finite per-creep pause/resume, reload survival, action suppression and receipt-settlement precedence. ED-44 explicitly owns allowlisted translation, effective fortification targets and snapshot-backed rollback. Both tickets retain unchecked criteria; this audit does not claim those controls exist yet.

The ordinary upgrader has two different position policies: upgradeController itself works within range3; role.upgrader.js28 additionally moves toward range2 except in W3N58. Current src/adapters/screeps/work-execution.ts uses range3 for all three work kinds and does not reproduce that tighter positioning. This is a real open policy difference, not an API correctness defect. A configurable room-specific approach policy must be implemented and tested, or an explicit correction accepted, before overall parity. ED-44 records this release gate. ED-22 remains open while the source-to-current-owner reconciliation is incomplete.

The table's previous idle-sleep item is superseded by its existing builder/fortifier disposition below: wallBuilder's internal RCL8 sleep10 is deliberately replaced by observed per-tick reevaluation. Operator pause semantics remain a different requirement. Historical validation counts elsewhere in this file describe their stated commits, not current suite coverage.


## Ordinary upgrader positioning restoration

The previously recorded range difference is now implemented through workerUpgradeApproachRange (integer1–3, default2 for the ordinary upgrader mode/profile). The shared native work adapter separates action range3 from preferred positioning. At range3 an accepted upgrade and a same-owner movement request can coexist; blocked/rejected upgrades do not generate positioning side effects. Build/repair and other work profiles keep range3. No runtime room-name literal was introduced. A W3N58 override3 is an ED-44 compatibility mapping, not an automatic memory read.

Actual normal-main native cases: default ranges3/2/2 with progress0/1/2 and energy20/19/18; room override3 ranges3/3/3 with the same progress/energy. The default first movement is observed at18,21, proving native movement and upgrade coexist. Existing worker-runtime and work-selection native regressions pass; all four cases have no errors/messages. Exact rows/provenance are in docs/evidence/worker-position-native.json. These targeted cases began at9b8e149 with dirty=true; they are not a new full aggregate.

Focused boundary/config plus smoke13tests263ms; full units1,085tests/316files8.13s; quality501production/454testfiles zero Lizard violations. The first quality pass found callback CCN11; range validation was extracted and the complete quality check rerun successfully. Both native cases are registered for the next aggregate. The preceding clean aggregate covered176cases at a6779f7 in663.13s (docs/evidence/construction-final-engine-suite.json); it predates this production correction.

Remaining ED-22 source audit includes the low-RCL adjacent-hauler/master interaction and consolidated seven-role ownership mapping. Explicit operator goAway/pause remains ED-39 and state translation/rollback remains ED-44. ED-22 stays open; this correction does not claim those separate controls are implemented.


## Low-RCL adjacent-supplier handoff restoration

Legacy role.upgradeMaster.js72–78 retires when low-RCL storage is missing, otherwise an empty master returns if an adjacent home hauler exists. Missing-storage handoff was already corrected above. New policy restores the collection wait for owned nonspawning, loaded, non-recovering upgrade-supply units on a route to this room. Observation is injected/lazy; mature or loaded masters do not scan suppliers. Only eligible adjacent suppliers wait the empty master; no role-string coupling was added to shared hauling.

Deliberate correction: an empty or unrelated adjacent hauler cannot indefinitely suppress service. Supply units returning through recovery also do not block the master. Native feature settlement still precedes the wait, and service request generation remains separate. Gate applies at the valid station, before collection and renewal, preserving legacy handoff ordering.

The new --master-handoff runs production main in owned RCL2 E0N1 with retained storage/terminal/lab geometry, a19-part master (950-energy body recipe) and a normal50-part supply courier. It moves the loaded courier from range2 into adjacency while the master has a pending service demand. Before the correction, native tick2 accepted competing200withdraw/900transfer attempts; actual incoming transfer was700 because master capacity is900. Native event journals correctly observed the partial result; the missing wait assertion failed (engine-lrGO2j). This was capacity contention, not fabricated delivery or lost energy.

After correction, the supplier hands off900 without a competing withdrawal; module reload3 preserves settlement. The master recovers250to the spawn and650to an active adjacent container. At the fixture's index10, consuming250spawn energy leaves50; reload11 preserves state. The still-adjacent empty supplier does not block later200withdraw/delivery from retained storage. Final storage299800, spawn250, container650, both creeps empty, incoming receipt900 and service receipts200; sponsor reserve remains4000. Including unchanged extension250, total initial301200 minus explicit consumption250 equals final300950. Every observed row satisfies that conservation equation, and master stays2,21 with exactly2units.

Fixture qualification: sponsor reserve was initialized explicitly; filled RCL2 extensions plus spawn50 keep available room energy at least300, avoiding native automatic spawn regeneration. Reload/consumption hooks were initially attached to the wrong loop variable and were corrected before the meaningful failing baseline. No production assertion or conservation requirement was weakened.

Exact baseline/passing rows, reset witnesses and regression provenance are retained in docs/evidence/master-handoff-native.json. Existing master-bootstrap, upgrade-master and master-loaded-loss native cases also pass without errors/messages. New case is registered for the next full aggregate. Full units1,087tests/317files8.16s; quality503production/456testfiles zero violations; focused policy+smoke3tests249ms. These are targeted dirty-checkout runs at96b9953; the latest clean full aggregate remains176cases at a6779f7 and does not cover this production addition. Consolidated role mapping and the new complete aggregate remain before ED-22 closure.


Seven-role functional reconciliation is consolidated in docs/worker-role-acceptance.md and source-inventory.json. Later expansion/control/migration requirements remain explicitly owned in Jira. Full179-case revalidation is pending; this source audit alone does not close ED-22.
