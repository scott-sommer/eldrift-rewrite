# Work selection and execution (ED-22)

## Current implementation

`capabilities/work/assessment.ts` defines plain observed facts and work orders. `adapters/screeps/work-assessment.ts` snapshots owned construction, repairable structures and controller state; externally supplied blocked-site/excluded-repair IDs preserve planning/operator boundaries. `features/work` owns small policy, candidate and selection modules. Policy is injected as plain data, not a service locator. The production room feature now composes these with persistent work tasks, the bounded task runner and shared movement/action dispatch. `workersEnabled` opts in; workers must carry population owner `work:<home>` and matching home. Room mode selects builder, fortifier or upgrader behavior. Population creation and energy acquisition are still separate unfinished work.

Builder selection orders controller downgrade emergency, critically damaged ordinary structures, dependency-ready construction, routine repairs, ramparts, walls and ordinary upgrading. Construction types have a configurable priority list. Fortifiers build first, then rank barriers by hits plus distance weight (default20000); builders preserve rampart-before-wall fallback. Upgraders select controller work. Ordinary upgrading can be suppressed by the caller's energy/recovery policy, while downgrade prevention remains available. Builder/fortifier upgrade fallback stops at RCL8; dedicated upgraders can maintain RCL8 when permitted. Current valid targets are retained within the best priority tier, but emergencies preempt lower-priority work.

Repair thresholds, wall/rampart targets, downgrade threshold, distance weight and construction ordering are injectable. Default barrier targets are50000, critical fraction0.2 and routine fraction0.8. Repair targets are capped to native maximum hits. Unowned controllers, hostile structures, excluded barriers, blocked construction, completed work and other-room targets are not selected. The selector does not own resource acquisition, population, hysteresis or role switching. Production tasks approach targets through shared movement, retain identity despite changing scores, and replace expired or superseded work with cleanup. No exclusive target lease is acquired: multiple workers may cooperate on a site/controller.

## Source mapping and deliberate changes

- role.builder.js ordinary home-room branch around247-266 builds before fortification; active rampart/wall paths around297-368 default to50000 and eventually delegate to ordinary upgrading belowRCL8. Its routine road/container repair block around269-294 is commented out. New critical/routine repair priorities are deliberate configurable behavior, not evidence that this commented block was active.
- role.wallBuilder.js evaluateNextTask and findLowestHits build first, then use barrier hits plus20000*range, with art-region exclusions and RCL-dependent targets, then upgrade belowRCL8. Weakness/distance and exclusion inputs are preserved; native Art-flag conversion and RCL/profile target derivation remain to integrate.
- role.upgrader.js and role.upgraderV2.js use energy acquisition before controller work, with link/storage/drop fallbacks. Only controller work selection is implemented here. Their resource/reserve behavior remains mandatory ED-22 work.
- Builder renewal, newSpawner/dedicated Upgrade Room travel, upgradeMaster positioning/boosting and specialist room policy require separate orchestration rather than hiding them in this selector. ED-22 must implement its shared behaviors and ED-31 must integrate room coordination. No source path is declared retired by this addition.

## Validation and native correction

Quality passed:198production/192testfiles, zero Lizard violations. Selection/adapter/smoke suite:8tests in223ms. Tests cover downgrade preemption despite disabled ordinary upgrading, strict repair thresholds, dependency readiness, configurable construction priority, stable current targets, barrier weighting/exclusions/caps, role distinctions, maximum-level behavior and invalid policy bounds.

Actual native `--work-selection` passed four ticks (artifacts/engine-h9WFVc/evidence.json). One worker completes a road site295->300, repairs another road3900->4000, then upgrades the controller0->1. Each tick uses the shared workStep and action arbiter; targets are logged explicitly. This fixture seeds worker energy and keeps targets in range: it does not prove a production worker loop, replenishment, movement or reset handling.

The first native runs exposed that controller prototype hit accessors exist but return undefined. Checking property existence admitted a bogus repair candidate; engine repair returned an issued result without useful work. Observation now requires finite hits/hitsMax and a positive maximum, with a dedicated regression. This is why native outcome changes, rather than OK codes alone, are required evidence.

## Next integration

1. Extend persistent work execution with acquisition and population below. Runtime currently shares a room-wide worker mode; mixed roles need explicit per-worker assignment. Foreign task definitions are supplied at composition and preserved without execution; automatic ownership reassignment is not yet implemented.
2. Add worker collection/delivery policy with reserves and runtime configuration, worker demand/body recipes, recovery state hysteresis/donor support and reassignment. Integrate Art exclusions and controller/fortification target profiles.
3. Prove an owned-room scenario that consumes/replenishes energy, builds, repairs, upgrades, replaces miner/hauler/worker losses and recovers after seeded energy loss. Exercise dedicated upgrade/master behavior rather than treating ordinary upgrade selection as its substitute.

## Production worker runtime evidence

`--worker-runtime` passed six actual engine ticks (artifacts/engine-nwVtka/evidence.json). The production main loop completes a road, repairs road3900->4000, and upgrades controller0->2. Upgrade task identity persists across ticks. Disabling workers clears the work task and stops energy consumption; reenabling creates a fresh task. Targets are in range and energy is seeded: replenishment, movement and recovery are not proven by this case.

Four task regressions cover score-independent identity, repeated temporary blockage without retry exhaustion, expiry, preemption scope cleanup, disable/cancellation, foreign head preservation, replacement creep identity and invalid-selection rejection. The task runner can validate shared task schemas while executing only its own registered behaviors. Cleanup and task persistence remain separate state writes, not a transactional guarantee.

Runtime configuration exposes workersEnabled (default false), workerMode (builder), workerWallHits/workerRampartHits (50000), workerDowngradeThreshold (5000), workerUpgradeReserve (50000). Ordinary upgrading is suppressed when owned-room storage is at/below the reserve; controller downgrade overrides that work-selection guard. Resource withdrawal limits still require acquisition policy.

Quality:202production/194testfiles, zero violations. Full unit suite:423tests/130files in3.52s. Bundle loading passed. Full pinned engine suite:80checks in102.16s. ED-22 remains In Progress; remaining acquisition, population, recovery and specialist acceptance criteria are open.
