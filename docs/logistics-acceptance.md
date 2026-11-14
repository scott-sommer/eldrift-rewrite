# ED-21 logistics acceptance audit

Audit base: 1167841. Legacy reference: f2bbf7e8c44addc7c426abb5458e393c9502ff5f. This is a source-to-evidence assessment, not a completion certificate. Jira ED-21 remains In Progress.

## Acceptance evidence

| Requirement | Implemented evidence | Remaining qualification |
| --- | --- | --- |
| Explicit requests, reservations and release | request-store, quantity ledger, reserve-transfer, hauling settlement; logistics-requests, select-hauling-task, hauling-settlement and retirement tests | Native link sends use one-tick quantity reservations but do not yet share the persistent request/receipt lifecycle. Decide and document this contract explicitly before closure. |
| Courier/distributor fallbacks, preservation, minerals and links | Energy consumer generation; drops/tombs/ruins preservation; mineral transport; energy banking; store balance; link routing/service; native scenarios in logistics.md | Controller-container and explicitly owned worker delivery now have native sequence evidence. ED-22 still must compose worker execution and population. Opt-in lab/link reclamation now has request, contention and native lab-withdrawal evidence; automatic starvation composition remains ED-22. General transfer support is not proof of those policies. |
| Production times route duration | courier-routes and hauling-demand tests vary rates, loaded/empty terrain travel, delay, utilization and replacement travel; native route observation | Native observation now includes safe mineral stations with active extractors and viable destinations, with actual miner rate and native route/queue evidence. Remote fleet integration remains ED-29; sustained economy evidence remains ED-42/ED-43. |
| Multi-tick failure behavior | Native partial transfer, empty/full/lost endpoints, expiry, death, reload, contention, mineral fallback, store guard and banking-demand scenarios | Banking-demand proves eventual service after an admitted bank transfer; it does not prove preemption or a starvation bound under continuing competition. |

Execution evidence and commands are recorded in logistics.md. The original audit was documentation-only; subsequent implementation sections there record executed checks and remaining integration limits.

## Source paths and ownership

- role.courierV2.js returning path (approximately lines 526-653): towers, then distributor-aware storage/terminal selection; without distributors, spawn/extensions, storage, controller container, then builder/upgrader creeps. Shared logistics now covers the stores/consumers and no-storage controller/worker fallback. Native work-supply verifies reserve filling before worker delivery, without draining the reserve. ED-22 must create workers, execute work and prove the owned-room loop; transport evidence alone does not close that issue.
- role.courierV2.js road construction and repair side effects (approximately lines 418-519): assign to shared work/construction policies in ED-22/ED-27, rather than introducing work intents inside hauling. Preserve the capability and prove ownership prevents competing actions.
- role.courierV3.js evaluateNextTask: home-node collection includes remote nodes, keeper restrictions and mineral preference. ED-21 owns reusable collection and local policy; ED-29 owns remote selection and travel risk, ED-35 keeper mission policy. Mineral transport and throughput-based native mineral fleet sizing now have evidence, including actual recipe capacity and terrain changes.
- role.scavenger.js getScavengeTarget/getDropoffTarget: dropped energy, tombstones, then non-essential links/containers/labs/terminal; spawning infrastructure first, durable stores second. Ordinary energy observation excludes lab/link energy; the separate opt-in reclamation observer now provides those donors only to spawning infrastructure, with admission contention tests and native lab withdrawal evidence. ED-22 owns starvation entry/exit hysteresis and emergency reassignment. Do not enable normal-time lab/link draining to approximate recovery.
- role.hauler.js run: configurable collection/return positions and collection radius, mixed resources, timed partial return, power collection, Upgrade Room delivery, stealing, recycle-on-completion. Local request transport is implemented; generic transport does not itself preserve all these policies. ED-29 owns remote transport orchestration, ED-31 Upgrade Rooms, ED-35 power expeditions, ED-39 operator stealing/retirement controls. Trace each invoked mode into those issues before claiming parity.
- role.mineralCourierV2.js: terminal/storage delivery and idle mineral cargo preference are covered by native mineral transport, recovery, fallback and reload scenarios. Configurable headroom replaces unsafe unbounded terminal targeting; recovery may consume headroom to avoid stranding cargo, documented in logistics.md.
- role.distributorV2.js: normal store balancing and links are implemented. Lab reagents/boosting belong to ED-36, power spawn/nuker supplies to ED-38, dismantle evacuation to ED-39. Each must generate owned requests through shared reservations, not bypass hauling execution.

## Deliberate changes and limits

Normal storage/terminal energy balancing uses configurable 20k/30k hysteresis and a >75% room-energy admission guard. This consolidates overlapping legacy thresholds; it does not reproduce every historical numeric branch. Storage headroom, tower thresholds and batch sizes are policy choices and require suitable release profiles.

Dead-unit retirement archives at most 50 units and 10 uncertainty incidents per unit. It handles known roster removals and name reuse; it does not sweep historical orphan journals or prove all persistent state bounded. ED-43 must measure growth; ED-44 must account for historical state during migration.

## Next closure work

1. Reclamation donor capability is implemented and tested; ED-22 must compose automatic recovery mode, including native link/industry coordination. Disabling currently retires unassigned work at the normal post-execution generation phase, not before same-tick admission.
2. Controller-container/worker fallback is implemented with explicit work ownership and native no-storage evidence. ED-22 must integrate population, consumption and replenishment; mobile recipient loss remains bounded by request expiry where disappearance cannot be distinguished from unseen travel.
3. Resolve native link request/receipt semantics against the first acceptance criterion; document observed delivery versus predicted loss precisely.
4. Mineral fleet sizing has native route and population-queue evidence; retain remote fleet integration as ED-29 and sustained economy/soak evidence as ED-42/ED-43.
5. Reconcile source rows and cross-issue obligations, run the full milestone checks once implementation gaps close, then assess ED-21 completion. Do not close it from test counts alone.
