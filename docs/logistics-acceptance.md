# ED-21 logistics acceptance audit

Audit base: 1167841. Legacy reference: f2bbf7e8c44addc7c426abb5458e393c9502ff5f. Local/shared logistics acceptance evidence is assembled below; final milestone validation and Jira transition are recorded at the end. Module-wide parity remains open under the explicitly listed feature issues.

## Acceptance evidence

| Requirement | Implemented evidence | Remaining qualification |
| --- | --- | --- |
| Explicit requests, reservations and release | request-store, quantity ledger, reserve-transfer, hauling settlement; logistics-requests, select-hauling-task, hauling-settlement and retirement tests | Native link descriptors are persisted before invocation in a bounded dedicated journal, sharing gross stock/capacity reservations. Next-tick engine events confirm gross sends; net receipts are derived under the pinned loss rule. Links are excluded from creep admission. |
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

## Integration obligations beyond shared logistics

1. Reclamation donor capability is implemented and tested; ED-22 must compose automatic recovery mode, including native link/industry coordination. Disabling currently retires unassigned work at the normal post-execution generation phase, not before same-tick admission.
2. Controller-container/worker fallback is implemented with explicit work ownership and native no-storage evidence. ED-22 must integrate population, consumption and replenishment; mobile recipient loss remains bounded by request expiry where disappearance cannot be distinguished from unseen travel.
3. Native link request/receipt semantics now have explicit journal, bounded retention and native contention evidence; see logistics.md for observed gross versus derived net quantities.
4. Mineral fleet sizing has native route and population-queue evidence; retain remote fleet integration as ED-29 and sustained economy/soak evidence as ED-42/ED-43.
5. Source-inventory rows now cite this evidence and remain explicitly partial for unported specialist/operator behavior. Final parity ED-42 must reconcile each named path; shared logistics completion is not whole-module parity.

## Cross-milestone obligation found during reconciliation

The ED-20 nearby-storage handoff is now implemented. Station observation/validation, tile ranking and handoff accept owned active reachable storage; native --mining-storage proves delivery and continued harvesting with no container/link. Version1 station records without the optional storage field remain valid. See logistics.md for exact evidence.

## Dormant source review

role.courier.js has no literal-import path from main. Its collection delegates to utilV2.collectEnergyFromMiner (drops, remembered dump target, moving to miner, general dropped-resource fallback), not a native withdraw-from-creep operation. Shared supply/request transport covers the resource collection mechanism. Its spawn/extension -> tower -> storage sequence is represented by consumer/banking policy with documented configurable thresholds. The hard-coded missing-home fallback is not retained as a default. Memory.goAway and Wait-flag parking remain ED-39 operator behavior; external invocation remains unverified, so the module is not declared retired or fully ported. ED-42 must close that classification with the operator inventory.

## Milestone validation

ED-21 acceptance is met for its shared transport mechanisms and local logistics policies. The four issue criteria have concrete evidence in the table above: explicit descriptors/reservations (including native links); local consumer/store/mineral/scavenging/link fallbacks; per-source production and loaded/empty route sizing; and the named multi-tick loss/reset/contention cases. Nearby-storage mining handoff closes ED-20's explicit dependency. Source-inventory entries remain partial where the original later milestones own work, recovery, remote, combat/industry and operator orchestration.

Final validation on this change: quality passed with193production/189testfiles and zero Lizard violations;412tests/127files in3.58s; packaged bundle passed; complete native engine suite78checks in90.12s (artifacts/engine-suite.json), including expected negative error/timeout cases. The legacy checkout and VES are unchanged. No live deployment occurred.

The remaining obligations above are mandatory inputs to the later issues and final capability closure; none are assertions of completed whole-bot parity. Bounded request expiry for unseen mobile recipients, lack of urgent in-flight preemption, opt-in profile defaults, and historical orphan-state migration remain documented limitations to assess in the relevant integration/soak/release gates.
