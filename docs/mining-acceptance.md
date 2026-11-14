# Mining acceptance audit (ED-20)

Status: incomplete. This is the current acceptance map; chronological entries in mining.md retain historical results and may describe gaps subsequently closed. Legacy reference: role.minerV2.js at f2bbf7e8c44addc7c426abb5458e393c9502ff5f. No live deployment or full rewrite parity is claimed.

| Criterion | Current implementation and evidence | Remaining evidence/work |
| --- | --- | --- |
| Station identity, access, infrastructure, throughput, availability, risk; no overbooking | MiningStation/validation; station-store persistence; observed geometry and infrastructure; physical tile leases; station/assignment tests. Engine saturation scenario holds five distinct leases across an actual code reload. | Remote freshness/assessment policy belongs to ED-29; unsafe unknown stations do not admit assignments. |
| Travel, establishment, harvest, maintenance, retreat; explicit depletion, target loss and replacement | Shared native miner/task/movement composition. mining engine covers arrival/production/container handoff; mining-work covers container construction, repair and injected retreat; replacement scenario proves staging and takeover after incumbent death. Task tests cover confirmed removal and lease cleanup. | Add mining-specific interrupted-travel recovery evidence. Full threat detection/retreat integration is weaker than injected unsafe-command evidence. |
| Separate energy and extractor/cooldown behavior | Separate readiness handlers; native extractor checks and body/boost rates. Specialist engine confirms link delivery and mineral cooldown cadence; depletion/capacity scenarios prove partial unloading and boosted overflow prevention. | Missing/inactive extractor are implemented but need native fault scenarios beyond readiness unit coverage. |
| Production, handoff, interrupted travel, saturation, reset without role-owned pathing | All mining movement goes through injected shared movement. New 12-tick saturation scenario uses production main, five WORK/CARRY/MOVE miners, excess queued demand, and a real code reload on the sixth tick. It checks five exclusive leases, no excess birth/queue, continued production and at least 90 total energy. | Interrupted travel remains an explicit mining acceptance gap. Capacity evidence covers a short controlled world, not sustainable economy throughput or soak performance. |

## Legacy paths and explicit downstream obligations

- Remote arrival success and end-of-life failure reporting (updateRemoteReachability) require ED-29's remote selection/reachability integration. Do not count local station arrival as implementation of this policy.
- Keeper-lair timing (checkForFlee) belongs to ED-35; broader hostile assessment/response belongs to ED-32. Current owned-room retreat is limited to spawn-adjacent endpoints.
- Depletion-time opportunistic building, collecting dropped energy and withdrawing from a dump target (building) are not fully preserved by container-only establishment. ED-22 must integrate shared work/resource behaviors for these paths; leave them incomplete in the parity matrix until implemented and tested.
- Source road/container site creation (initializeMining calling buildRoadsFromPath) belongs to desired-state planning/construction ED-23 through ED-27 and remote logistics ED-29. Existing-site building is not automatic infrastructure creation.
- Legacy storage fallback as a dump target is not represented in current container/link station contracts; integrate explicitly with ED-21 logistics, with a regression for a station served by nearby storage.
- Legacy mineral sink capacity pre-check and 70-percent transfer policy differ from current overflow-safe, full/depleted cargo handoff. ED-21 must establish reservation/backpressure policy and delivery evidence. Do not silently equate potential harvest rate with delivered rate.
- Mining repair priority now retains the legacy strict below-20-percent damage threshold and above-20-energy reserve during harvesting, with routine repair during energy-source depletion. A pure overrideable policy feeds native observation. The mining-work engine fixture verifies routine damage leaves harvesting active and a critically damaged container is repaired after the worker crosses the reserve threshold. General depletion-time resource acquisition remains ED-22 work.
- Harvest statistics move to ED-40 diagnostics. Removed legacy suicide-on-missing-assignment behavior is replaced by explicit waiting/failure and lifecycle cleanup; no creep suicide is issued for transient assignment loss.

## Validation for saturation addition

Targeted engine scenario --mining-saturation passed after correcting the fixture to read reservation resource identities (not a nonexistent key property). Evidence: artifacts/engine-Alk8x6/evidence.json, including reload provenance. The earlier failed run was a fixture observation error and is not success evidence. Quality passed with zero Lizard violations before that field correction; rerun checks before committing. This scenario is registered in the full engine suite. Full suite execution for this addition is tracked below when run.

Final validation: quality rerun passed (120 production files, zero Lizard violations); broad smoke passed in 182ms; full engine suite passed all 31 cases in 29.63s. Unit suite was unchanged and not rerun for this engine-fixture-only addition.

