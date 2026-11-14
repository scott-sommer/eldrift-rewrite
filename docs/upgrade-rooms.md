# Upgrade-room service and remaining specialist parity

Current status: the production runtime includes specialist upgrader/master fleets, bootstrap workers, lifecycle/parking and the opt-in supply fleet. The sections below record incremental implementation evidence; early limitations are historical where a later section explicitly supersedes them. Combined reset/reclaim/bootstrap/rebuild, additional failure scenarios, and full specialist parity remain incomplete. See the latest supply runtime section for configuration.

## Ported service policy
The pure upgrade-service planner selectively ports role.upgradeMaster.js into one desired shipment per observation. It first clears non-energy storage stock into terminal, then services the first active owned lab, then energy demand. Native selection uses deterministic structure IDs instead of incidental enumeration. Existing shared service reconciliation retains admitted cargo through direction changes; local couriers execute using standard quantity reservations, lab mineral compartment capacity, native transfer journal and movement.

Boost preference is XGH2O, GH2O, GH. As in the legacy, lab mineral maintenance starts below the configured target, terminal candidate stock must be strictly greater than that target, and topping an existing mineral requires strictly more terminal stock than the missing quantity. An inferior/unsupported or insufficiently supported partial lab is drained before switching. A full lab is not replaced until it falls below the target. Energy service prioritizes spawn at/below its floor, then lab, then storage. Below RCL6 storage can supply the spawn when terminal energy is unavailable.

Deliberate corrections: missing/disabled endpoints do not throw; observed headroom bounds each shipment; mineral fill stops at its target and storage fill at its ceiling instead of overshooting with a whole carry load. Physical ownership/activity is checked at observation. General store balancing is suppressed while this service owns the room's terminal/storage policy to avoid opposing transfers. Recovery stops new service admission (including energy requests) and reconciles unreserved service work; already-carried cargo can settle. Future general lab/boost orchestration must explicitly coordinate lab ownership with this service.

## Configuration and execution
upgradeRoomServiceEnabled defaults false and requires logisticsEnabled to execute. It generates requests for the existing courier fleet; enable courierSpawningEnabled for automatic local courier demand. It does not yet create or position a dedicated upgrade master.

Defaults: upgradeLabMineralTarget1300, upgradeSpawnEnergyFloor100, upgradeStorageEnergyCeiling990000, upgradeServiceBatch200. They use the normal layered room configuration. New requests pause during energy recovery. Service configuration is independent of normal worker modes and does not claim that specialist renewal/boosting is implemented.

## Evidence
Pure policy tests cover storage cleanup precedence, stronger boost replacement, strict stock boundaries, incompatible mineral clearing, terminal capacity, energy order, storage ceiling and pre-RCL6 fallback. Admission tests cover opt-in/disable/recovery and preserve ordinary/support/recovery-banking scope gates.

Packaged --upgrade-service runs the actual main loop for150ticks with a50capacity courier, storage20H, lab40GH, terminal1500XGH2O+100energy. Final storageH0, lab1300XGH2O+100energy, terminal20H+40GH+200XGH2O, courier empty, tasks/claims empty. The fixture records confirmed receipt IDs across request expiration and proves totals H20, GH40, XGH2O1300 and energy100, rather than relying only on final cargo disappearance. Stronger evidence engine-pPvy8G passed; initial engine-YXpZJ5 checked final stock and retained final-energy receipts only. The strengthened fixture supersedes that narrower evidence. Final thresholds/native active-stock refinements are also covered by the full regression recorded below.

Quality237production/225testfiles passes with zero Lizard violations. Full479tests/147files passes3.86s; packaged bundle check passes.

## Remaining UpgradeRoom/master requirements
upgradeRoom.js implements a seven-position storage ring, TTL sorting/reassignment, staggered renewal triggers, rotation after renewal, boost requests and empire-energy shutdown. Those need feature-owned persisted state, stable creep identity, geometry validation, shared spawn/lab action ownership and native scenarios. Remove the hardcoded Mordox identity comparison in favor of actual ownership.

The legacy RCL8 unclaim/reclaim cycle is a real capability, not a placeholder. It requires an explicit configurable lifecycle and simulated validation, including claimer access and memory continuity. No live unclaim, deployment or destructive in-game migration is authorized by this implementation.

role.upgradeMaster.js additionally positions a dedicated master adjacent to lab/storage/terminal/spawn, travels from its home to assigned room, handles low-RCL retirement/hauler interaction, and renews below500TTL. These remain open; shared courier servicing is not evidence that the stationary master lifecycle is complete. Specialist population/body demand, upgrader renewal/boost execution and assigned-room work remain ED-22/ED-31 integration work.

Full102native checks passed155.98s before the final full-spawn threshold refinement. Review then found that configuring spawnFloor equal to capacity could let a full spawn mask lab demand. The planner now requires actual spawn headroom; unit coverage checks that boundary. Final full479tests/147files passed4.46s, bundle and quality passed. The strengthened native service case sets spawnFloor300 and ordinary storeBalancingEnabled=true: service still owns all requests, the full spawn does not block lab energy, and every inventory/receipt assertion passes (engine-7qSPoU). Thus the final narrow guard has targeted native coverage; a second full102case rerun is not claimed. No live deployment, renewal, boosting or unclaim operation was performed.

## Durable rotation policy and station validation
upgrade-rotation now expresses the seven-station lifecycle independently from engine actions. Its version1 upgrade-room namespace stores stable unit IDs and unique slots, the current renewal identity, pending boost identities, sticky retirement identities and last processed tick. The store wrapper persists the decision before a future adapter acts. Reconstructed/same-tick calls cannot rotate or issue another policy command; backwards ticks and malformed/oversized/duplicate rosters fail validation. Callers must provide a complete authoritative unit roster, not interpret room invisibility as death.

Initial or changed rosters sort by TTL then ID, oldest at slot6, with deterministic slots descending toward0. Existing assignments stay stable between roster changes. Strict trigger thresholds by slot1..6 are800/640/480/320/160/10. Any crossed threshold requests renewal of the slot6 unit. Renewal remains requested until observed TTL is strictly greater than1490; all slots then advance modulo7 and the renewed unit receives a pending boost at slot0. A caller-supplied settledBoosts observation clears that pending state; the policy does not infer successful boosting from an issued command.

Default empire reserve is2600000 plus100000 per other owned room. Falling strictly below it marks current members for retirement, suppressing renewal/boost commands; retirement remains sticky for those identities after energy recovers, matching legacy killMe semantics. Disabling the feature alone does not mark a fleet for retirement. New creep IDs do not inherit old renewal/retirement/boost state.

Deliberate partial-roster correction: when rotation leaves no slot6, a pending boost retains its slot until settled; afterward the remaining roster is reassigned for the next renewal cycle. Legacy cleared assignments immediately when no tail existed, which could lose a usable boost-position interval. Roster changes also remove stale identities and invalid renewal ownership immediately rather than retaining phantom stations. More than seven members is rejected rather than assigning negative slots.

upgrade-stations separately validates the legacy storage-relative order N/NW/W/SW/S/SE/E. An injected standability test checks all seven tiles; exits are rejected, every station must reach the controller within3, east/slot6 must reach spawn within1, and north/slot0 must reach lab within1. Invalid geometry produces a reason and slot without issuing movement. No automatic layout or alternate ring arrangement is claimed.

Tests cover all six strict trigger boundaries, observed renewal completion, full-ring exactly-once rotation, pending boost persistence/reset, partial-ring reassignment, identity replacement after shutdown, sticky reserve behavior, disabled policy, invalid state/rosters/ticks, and blocked/out-of-range station geometry. These are policy/persistence tests, not native renewal/boost evidence. The runtime still needs configured specialist identity/population, station ownership and movement, shared spawn/lab action arbitration, body-observed boost settlement and native multi-tick scenarios. Unclaim/reclaim and dedicated master renewal remain open.

Validation for this policy increment: full493tests/149files passed3.92s; quality242production/227testfiles passed with zero Lizard violations; packaged bundle validation passed. These new policy modules are not registered in main yet, so no new native scenario or renewal/boost success is claimed. The previously recorded native service/regression evidence remains unchanged.

## Shared native structure actions
Production spawn dispatch now uses the same durable admission boundary exposed for renewal and boosting. Each attempted action reserves its structure; renewal and boost also reserve the target creep body, preventing two spawns/labs or opposing renewal/boost operations from touching that body in one tick. Room energy is debited before spawn/renew effects; spawn allocation observes remaining energy and excludes already-admitted spawns. Renewal issued before the population flush takes precedence; unassigned population requests remain queued.

Admission is persisted before calling the engine. Reconstructing the dispatcher in the same tick cannot duplicate an intent. Rejected or throwing calls conservatively retain admission and energy for that tick; next-tick observations allow retry. Admission is not proof of engine success. The bounded ledger holds at most1000 entries and expires on the next tick. Body ownership here is limited to structure mutations; creep work/movement remains with the existing action arbiter.

The renewal cost follows the pinned engine4.3.2 formula ceil(1.2 * bodyCost /3 /bodyLength), using every body part including damaged ones. Native ownership/range/activity/busy/TTL checks still apply. API reference: https://docs.screeps.com/api/#StructureSpawn.renewCreep . Pinned source: tools/engine/node_modules/@screeps/engine/src/processor/intents/spawns/renew-creep.js and game/structures.js. Boost is a native intent only; future specialist orchestration must observe the resulting body before settling a pending boost.

New packaged --structure-actions exercises the production dispatcher over3ticks: renewal raises observed TTL499 to798 (300 renewal minus1 tick), duplicate renewal and same-tick boost return ERR_BUSY, next-tick boost is observed on the body, and the deferred MOVE spawn begins. Room energy400→370→320 proves30 renewal and50 spawn costs. Two extensions keep energy above automatic spawn-regeneration threshold; the initial fixture without extensions correctly exposed regeneration and failed the stricter accounting assertion. Passing evidence: artifacts/engine-AnQz2I/evidence.json.

Fast regression:498tests/151files passed3.91s; quality244production/230testfiles with zero Lizard violations; packaged bundle validation passed. This adds native action evidence, not a complete specialist-room lifecycle. Configured specialist fleet ownership/population, station movement, observed boost settlement, dedicated master positioning/renewal, and simulated RCL8 unclaim/reclaim remain required in ED-22.

Full native regression after the shared dispatch change:103 checks passed in147.31s, including expected error/timeout cases; aggregate evidence artifacts/engine-suite.json.

## Integrated specialist ring runtime
The registered upgrade-room feature is now opt-in through upgradeRoomEnabled (default false), independent of ordinary workersEnabled and upgradeRoomServiceEnabled. Specialist creeps use population.owner = upgrade-room:<target room> and population.home = <target room>. Ordinary work policies do not claim these creeps. The current increment executes an existing specialist roster; it does not yet generate the fleet.

The room must be owned and have an active owned storage, spawn and lab matching the validated seven-station geometry. Selection matches service policy's deterministic first-active-ID ordering. Terrain, structures, sources, controller and owned obstacle construction sites constrain standability; transient creep occupancy does not invalidate the ring. Invalid/missing layout holds execution. The room feature takes the complete own-creep roster by identity, including members travelling outside the room, and rejects more than seven members through the rotation contract.

Each member moves through shared traffic dispatch with a common group, upgrades when in controller range and carrying energy, and withdraws adjacent storage energy through the existing quantity-reservation collection boundary. No separate uncoordinated moveTo or withdraw path is introduced. Native renewal/boosting uses the shared durable structure admission. Seven-member cyclic movement is verified in the engine.

upgradeRoomEmpireReserve defaults2600000 and upgradeRoomOtherReserve defaults100000. Energy sums owned-room storage and terminal stock, matching the legacy energy components in controller.js:583-656; ordinary creep cargo, spawns/extensions and lab energy are not empire reserves. Below the strict aggregate threshold, members become persistently retiring, keep working, and stop renewal/boost commands. A retired member also cannot trigger a delayed rotation when an earlier accepted renewal happens to cross the completion threshold. Disabling the feature alone does not retire identities.

The upgrade-boost journal persists identity, tick and prior boosted-WORK count before the native call. OK remains pending until a later tick observes an increase on that same body's WORK parts. ERR_NOT_ENOUGH_RESOURCES is recorded as the legacy's explicit skip, distinct from successful boosting. Other rejections/uncertain calls can retry next tick. Settlement stays durable until rotation persistence consumes it; a new creep ID cannot inherit an old result.

### Native evidence for this integration
--upgrade-room runs the production main loop for24ticks with seven50-part specialist bodies (42WORK/3CARRY/5MOVE), a valid ring, storage and lab stock, and a persisted in-progress renewal. It proves storage collection and sustained upgrading (controller progress0→7140), full-ring rotation [0..6]→[1,2,3,4,5,6,0], exact final station positions, native lifespan extension and42 observed boosted WORK parts, followed by clearing pending boost state. Engine code reload at tick7 resumes renewal; reload at tick15 witnesses the issued tick14 boost still pending and then settles from body observation. Evidence: artifacts/engine-dsBsCo/evidence.json.

--upgrade-room-shortage enters reserve shortage when its fixture flag becomes visible on tick2, restores the permissive reserve threshold on tick8, and verifies all seven identities remain retiring with no further renewal or rotation. TTL decreases exactly one per tick from observed retirement entry; controller progress continues to6762. Evidence: artifacts/engine-Fta164/evidence.json (before the fixture's type-only local-variable correction); the full regression below reruns the final fixture. The initial shortage assertion incorrectly assumed flags were visible on tick1 and was corrected to use observed entry, not weakened to tolerate renewal during retirement.

Fast regression:501tests/152files passed4.03s; quality249production/232testfiles, zero Lizard violations; bundle validation passed.

### Remaining specialist lifecycle
Remote sponsoring-room fleet creation, the legacy >10M start / <5M stop spawning hysteresis, low-RCL newSpawner/bootstrap and supply-hauler paths, dedicated upgrade-master positioning and renewal, and configurable simulated RCL8 unclaim/reclaim remain incomplete. Source reference: spawner.js:1699 onward and role.upgradeMaster.js. This runtime is evidence for the renewal/work ring only; it does not close ED-22 or ED-31. Fleet generation must preserve target-room identity across a different spawn home and avoid normal TTL replacement overfilling the seven-station roster.

Full native regression for the integrated feature:105 checks passed in165.58s, including renewal/boost reload, shortage recovery and expected error/timeout scenarios. Final aggregate evidence: artifacts/engine-suite.json.

## Sponsored specialist fleet generation
The production upgrade-fleet feature now generates the mature-room upgrader roster. It runs from owned spawning rooms and reconciles configured target rooms plus existing queued upgrade-room owners, so disabling/changing configuration or losing target ownership cancels that sponsor's pending work without touching other owners.

Target-room configuration:
- upgradeRoomSpawningEnabled defaults false and also requires upgradeRoomEnabled.
- upgradeRoomSponsor defaults empty, meaning the target room itself; set a separate owned sponsoring room for the legacy remote-production pattern.
- upgradeFleetTarget defaults7 and is bounded0..7.
- upgradeFleetBodyBudget defaults4600; the existing remote-upgrader recipe produces42WORK/3CARRY/5MOVE when affordable. A full body normally requires an RCL8 sponsor; no cost or room-capacity check is bypassed.
- upgradeFleetStartEnergy defaults10000000; upgradeFleetStopEnergy defaults5000000. Start is strictly greater, stop strictly less, and equality preserves state.
- upgradeFleetStorageFloor defaults200000, also a strict greater-than requirement for mature-room spawning.

Hysteresis is persisted per target room, permitting independent configuration instead of the legacy single global Memory.upgradeRoomSpawning flag. While configured, its energy observation continues even if target geometry/storage eligibility temporarily fails. Target eligibility separately requires current ownership, controller belowRCL8 and a valid active storage/spawn/lab ring. These gates intentionally do not stand in for the still-unported low-RCL bootstrap and reclaim lifecycle.

SpawnRequest now optionally carries home, independently of room (the production room). populationMemory uses home when present and preserves the old room fallback otherwise; the additive field is validated and old version1 queue records remain readable. Specialist requests therefore spawn in the sponsor but retain population.home=<target> and population.owner=upgrade-room:<target>, allowing the existing runtime to move them to the target ring.

Fleet demand counts all observed matching identities, including spawning, travelling and low-TTL units. It does not invoke ordinary TTL replacement for renewable specialists. Pending requests in other owned-room queues count toward the cap during sponsor changes. Expired, observed, incompatible and excess requests are reconciled by owner; ordinary queues are retained. Death opens a slot for a newly reserved unique identity. Reducing the configured target cancels excess pending work without deleting live creeps.

### Fleet evidence
Pure tests verify strict hysteresis boundaries/reset persistence, six live/spawning/low-TTL units plus one queued unit, repeated reconciliation without duplication, actual-death replacement with a new name, sponsor handover with another pending queue, owner-scoped cancellation, home-memory mapping and invalid configuration.

Packaged --upgrade-fleet begins with no creeps, uses the actual production main loop and creates a50-part specialist at the W0N1 sponsor. Over240ticks it crosses into E0N1, reaches the east station(6,22), and advances the controller to2772 progress. The observed population never exceeds the configured target1 and the sponsor queue is empty at completion. Initial passing evidence: artifacts/engine-iHPjbO/evidence.json. The final suite additionally reloads the engine at tick51 while this same creep is still spawning and verifies its target home survives.

Packaged --upgrade-fleet-loss leaves a request waiting for sponsor energy, removes target ownership at tick4, then restores sponsor energy at tick5. No creep spawns and the pending request is cancelled. Evidence: artifacts/engine-kHww5r/evidence.json.

Fast validation:505tests/153files passed3.95s; quality252production/234testfiles with zero Lizard violations; packaged bundle validation passed. Full native regression is recorded below.

Remaining: low-RCL newSpawner/bootstrap and supply-hauler policies, dedicated upgrade-master population/positioning/renewal, target ownership-loss handling for already-live specialists, configurable simulated RCL8 unclaim/reclaim, operator flag translation, and other open ED-22 requirements. Mature-ring fleet spawning is implemented; these other paths remain explicit parity work.

Full native regression:107 checks passed in175.08s. Afterward the two fleet fixtures were strengthened to assert physical sponsor energy; both passed again with final quality checks. Final --upgrade-fleet evidence engine-MOfh9S proves5300→700 energy (4600 spent), reload during spawning, arrival and2772 controller progress. Final --upgrade-fleet-loss evidence engine-b3ayXK proves energy restored to5300 with zero spawned creeps and an empty queue. Production code was unchanged after the full suite.


## Dedicated mature-room upgrade master

The opt-in upgradeMasterEnabled and upgradeMasterSpawningEnabled settings default false; upgradeMasterRenewBelow defaults500 (0..1400). Master production shares the target's sponsor and persisted fleet energy hysteresis. The owned pre-RCL8 target must have active storage, terminal, spawn and lab arranged around the standable lab+(1,1) station. All four stores must be adjacent. The full legacy body is1MOVE/18CARRY, cost950; one live, travelling, spawning or queued master satisfies demand regardless of TTL. Owner upgrade-master:<target> remains separate from the seven-member ring. Renewable population reconciliation is now a shared narrow mechanism rather than duplicated policy.

Provenance: role.upgradeMaster.js fixed station, service and renewal; spawner.js master body/priority10 and mature-room eligibility. Master travel uses shared navigation. On station, the existing hauling task, quantity reservations and transfer journal perform service; task movement cannot leave the station and cargo recovery accepts only adjacent sinks. Ordinary couriers stop admitting master-owned service demand. Bound cargo-recovery requests also no longer recruit empty couriers. The ring feature executes before the master, preserving urgent ring renewal precedence through shared structure admission.

The first native scenario exposed a real ordering defect: generating service after settlement but before executing the carrying task cancelled its request during the reservation gap. The master returned cargo and repeated transfers; redundant courier demand was also exposed. Execution now restores the carrying delivery reservation before service reconciliation, matching ordinary logistics. Assertions retain exact confirmed resource totals, empty final cargo and no extra couriers.

Native --upgrade-master runs120ticks with no seeded master: actual spawn produces19parts, the master reaches22,21 and remains there, delivers confirmed H20/GH40/XGH2O1300/energy100, empties cargo and renews after the fixture lowers TTL. Final lab holds1300XGH2O, terminal H20/GH40/XGH2O200, storage H0. Only master and the seeded ordinary courier exist; the ordinary courier remains empty. Targeted evidence: artifacts/engine-zEK5o6/evidence.json.
Native --upgrade-master-contention runs8ticks: the50-part ring member renews (observed TTL4→81), while the19-part master waits (399→392) at its station. Evidence: artifacts/engine-PPLRKT/evidence.json.

Validation:508fast tests/154files pass in3.93s; type/lint/dependency/Lizard checks pass across257production/236test files with zero violations; packaged bundle check passes. Full final native regression passes109checks in177.06s, including both master cases; aggregate artifacts/engine-suite.json.

ED-22 remains In Progress. Low-RCL bootstrap/supply paths, already-live specialist ownership-loss handling, configurable simulated RCL8 lifecycle, distributor recovery restart and sustained combined colony/loss evidence remain outstanding. This increment proves mature-room master service and renewal, not full specialist lifecycle parity.


## Ownership-loss parking and return

A visible-room upgrade-parking feature now preserves the legacy upgradeRoom.js:59-66 behavior that clears controller access after ownership loss. Owned-room work remains under the existing specialist features. The new feature runs even when no owned rooms remain, using only visible controller evidence; unseen rooms do not imply loss.

Enabled ring/master identities retain population ownership, cargo and rotation state. Master hauling effects settle through the existing transfer journal even while the room is unowned; no new service, upgrade, collection, renewal or boost action is issued there. Parking uses shared movement and distinct standable interior tiles near the first spawn, or a controller-offset fallback if no spawn exists. Candidates exclude range3 around the controller to provide circulation space as well as clearing its range1 claimer access. Other creeps/power creeps, terrain and structure obstacles exclude destinations. Existing valid parking is retained; unavailable destinations hold for later assessment. This is parking for reclamation, not hostile-room combat/evacuation policy.

Native testing found that shared atomic grouping was inappropriate for independent parking and ring assembly. Parking now permits independent traffic decisions; ring movement uses an atomic group only when the entire roster occupies ring stations. Returning units can reach their stations without waiting for an unrelated blocked member.

The test also exposed a generic detour oscillation: after one successful step around congestion, navigation returned to the blocked shortest route. Congestion avoidance now remains active for the same destination/range until arrival, a changed goal or bounded expiry. Native path search also limits maxRooms to the permitted corridor size; a one-room route cannot search outside it. These corrections retain shared traffic/action arbitration and are documented in movement.md.

--upgrade-loss runs160ticks with seven seeded50-part upgraders and a19-part master. The fixture removes target ownership at tick4, reloads code during loss, and restores ownership/RCL7 at tick76. For72ticks there are no owned rooms. All eight clear controller-adjacent tiles, their TTL decreases without renewal, and energy remains unchanged during the unowned interval. A tick3 master transfer settles after loss with the identical attempt ID and exactly20 observed/receipted hydrogen. All eight return to their exact original service/ring stations after restoration, while controller progress advances beyond1000. No units are replaced or reassigned. Ownership restoration is fixture assistance; this does not prove automatic unclaim/claim or low-RCL rebuilding.

Initial failed runs remain useful evidence: engine-JQ0gho exposed near-controller parking blockage; subsequent runs exposed all-or-nothing travel grouping, route oscillation and native searches attempting unavailable terrain outside their corridor. A premature assertion read expired logistics records at tick120; the fixture now captures the receipt at settlement tick4 instead. No completion assertion was removed: final tests require all eight stations and exact transfer identity/result. Passing targeted evidence: artifacts/engine-dcaYLQ/evidence.json; the full regression below reruns the final helper extraction and fixture.

Quality passes264production/243testfiles with zero Lizard violations;520tests/159files pass4.06s; bundle validation passes. Remaining ED-22 work includes low-RCL bootstrap/supply, automatic simulated RCL8 unclaim/reclaim, assigned-room work semantics and sustained combined colony/loss evidence.

Final full engine regression:111checks passed177.49s, including ownership loss/restoration, ring rotation, master service, cross-room navigation and expected negative cases (artifacts/engine-suite.json). After strengthening the existing navigator integration assertion,12focused tests/5files pass239ms; final quality again passes264production/243testfiles with zero violations. No production changes followed the full regression.


## Controller lifecycle contract (runtime connection outstanding)

upgrade-lifecycle-model, upgrade-lifecycle and upgrade-lifecycle-store now separate controller observation, policy decisions and injected effects. This is an implemented/tested domain contract, not yet a registered native feature. The packaged main loop therefore cannot automatically unclaim or reclaim through this increment.

Provenance: spawner.js upgradeRoom branch1699 onward unclaims atRCL8 and queues a claimer for an unowned target; its later pre-spawn condition is unreachable after that earlier RCL8 branch. role.claimer.js:244-252 claims a controller and treats existing ownership separately; spawner.js:955 uses CLAIM/MOVE. The new contract requires explicit lifecycle and cycle-at-RCL8 enablement, an active economic gate, an available sponsor and a ready existing claimer before releasing an owned RCL8 room. It does not copy the hardcoded Mordox identity or attack foreign controllers/reservations.

The observation carries controller identity/ownership/level, reservation control, GCL availability, sponsor availability, economic gate and claimer readiness. Native adapters must establish readiness from a live, nonspawning, owned CLAIM unit at the intended controller, with sufficient lifespan; it is not inferred from a pending spawn request. Preparing a reset requests one claimer; lower-RCL owned rooms continue growing. Neutral initial targets can request/perform a claim when GCL permits. Foreign control, unseen controllers, disabled policy and unavailable claim capacity hold. Existing claimers may finish reclaiming after observed release even when the economic gate closes or the sponsor becomes unavailable. Disabling lifecycle still prevents further actions.

State owner upgrade-lifecycle/version1 persists controller identity, last evaluated tick, last attempted command, observed release and completed cycle count. The coordinator saves before calling an injected controller-effect port; an exception or reconstruction in the same tick cannot repeat that effect. Same-tick replay retains the current desired claimer count while suppressing the command. Return codes never mark a cycle complete. A reset cycle increments only after observing neutral ownership following the recorded unclaim and then own ownership belowRCL8. Initial claims, unchanged ownership, a different controller ID and loss of visibility cannot forge completion. Disabling actions does not prevent observation/settlement of an already-started lifecycle.

Eight new tests cover preparation, explicit cycling, observed completion exactly once, gate closure/sponsor loss, GCL blocking, foreign/reserved/unseen targets, controller identity change, disabled settlement, persist-before-effect exceptions and same-tick reconstruction. Validation:528tests/160files pass4.10s; quality267production/244testfiles, zero Lizard violations; bundle validation passes. No new native lifecycle scenario has run; the last full native regression remains111checks/177.49s at0670dfe. Initial excessive-complexity validators/decisions were extracted before final validation.

Next integration must supply opt-in runtime configuration, target-scoped CLAIM/MOVE recruitment and remote routing, native ownership observation and effect admission, and real-engine reset→unowned parking→claim→low-RCL recovery evidence. It must demonstrate GCL/failed-claim/reload cases and coordinate with the pending bootstrap/supply work. The lifecycle contract alone does not close ED-22 or demonstrate automatic reclaim.


## Native controller lifecycle integration

The registered visible-room upgrade-lifecycle feature now connects the prior domain contract to native observation, a dedicated claimer population, shared movement and controller-effect admission. Target-room configuration:
- upgradeLifecycleEnabled defaults false.
- upgradeCycleAtRcl8 defaults false; enabling lifecycle alone permits initial neutral-room acquisition without enabling RCL8 release.
- upgradeClaimerMinimumTtl defaults50, bounded5..599, used before releasing an owned RCL8 controller.
- upgradeRoomSponsor selects the owned production room (empty means the target itself). Existing upgradeFleetStartEnergy/StopEnergy provide the economic hysteresis.

A ready reset claimer must be live, owned, nonspawning, have active CLAIM, enough TTL and be adjacent to the exact target controller. Neutral-room claim readiness permits any positive remaining TTL. Full CLAIM/MOVE bodies cost650 and retain target population.home even when produced elsewhere. Renewable fleet reconciliation limits live/spawning/pending identity demand to one, with priority10 and no ordinary TTL replacement. Configuration disable/sponsor changes cancel only obsolete claimer requests, including queues whose target is unseen. Travellers execute from their current visible room so losing target vision cannot stop cross-room progress; absent target vision routes toward the target-room interior until its controller is observed.

Controller actions use the existing persisted intent-admission ledger: controller identity prevents conflicting/reset duplicate intents; claim also reserves the creep identity and one available GCL slot. The normal creep action arbiter enforces action ownership. Native return codes are passed back but do not settle lifecycle completion. Rejected/throwing effects conservatively retain admission for that tick and can retry next tick. Controller availability/ownership and GCL are observed afresh. The effect adapter is shared through native dispatch, with no second direct native claim loop.

After successful lower-RCL acquisition the claimer parks off controller access instead of immediately suiciding as the legacy role did. Its ownership remains dedicated and it can wait for subsequent lifecycle work until natural expiry. This is a deliberate retention policy; automatic bootstrap spawn placement and post-reset low-RCL building/supply remain outstanding rather than being claimed through the claim action alone.

Pinned engine4.3.2 source inspected: game/structures.js:201 unclaim, game/creeps.js:839 claimController, processor/intents/controllers/unclaim.js and processor/intents/creeps/claimController.js. Both operations are deferred intents; processor ownership and GCL outcomes are the evidence, not an OK return.

### Native evidence

--upgrade-cycle runs55ticks from an RCL8 owned room with650spawn energy and no seeded claimer. Cycling stays disabled for the first5ticks, then production spawns CLAIM/MOVE. On tick17 the ready adjacent claimer permits native unclaim; duplicate admission returns ERR_BUSY. A genuine code reload before tick18 sees the old unclaim attempt with controller level0. Native claim issues at18, also rejects a duplicate, and later observation records exactly one cycle atRCL1. With no owned room during release, the economic gate/sponsor become unavailable but the existing claimer still completes recovery. Final claimer stands off controller access. No fixture writes ownership after initial world setup. Targeted evidence: artifacts/engine-tImNtM/evidence.json.

--upgrade-claim runs60ticks with a neutral E0N1 target observed by a seeded MOVE-only observer and an owned W0N1 sponsor. At GCL1 no claimer is spawned. The fixture increases GCL capacity at index5; a real CLAIM/MOVE then spawns in W0N1, crosses into E0N1, claims it and parks. Sponsor remainsRCL8, target becomes ownedRCL1, one claimer retains homeE0N1, and reset cycles remain0 because this is initial acquisition. The GCL increase is fixture assistance, not a claim of autonomous GCL progress. Evidence: artifacts/engine-sVqEBR/evidence.json.

Contract checks also cover GCL-slot contention, same-tick reconstruction, uncertain unclaim, rejected native claim retry, ownership errors and sponsor-scoped queue cancellation. The rejected-claim result is mocked contract evidence; the engine scenarios cover successful native actions and GCL-policy prevention. Low-RCL bootstrap/supply, combined seeded specialist reset/reclaim/rebuild, assigned-room worker semantics and sustained colony-loss recovery remain required in ED-22.

Final validation:532tests/161files pass4.95s (concurrent engine regression); quality272production/247testfiles has zero Lizard violations; bundle validation passes. Full113native checks pass190.42s, including reset/reload and remote GCL acquisition (artifacts/engine-suite.json). The final mocked rejection/retry test was added during that engine run; no production edits followed its start. Operator claim-intent routing blacklists and bootstrap placement still require their corresponding expansion/operator integration; these are not implicitly supplied by the fixed current movement policy.


## Bootstrap policy extraction (ED-22, 2026-11-15)

Ported legacy spawner.js lines 1045-1066 and 1749-1810 into upgrade-bootstrap-body.ts and upgrade-bootstrap-policy.ts. The body retains the mobile WORK/CARRY/2 MOVE recipe below 1300 energy and six WORK plus capped carry capacity above it. Demand retains strict 200000 storage and RCL5 remaining-progress supply boundaries; it subtracts target upgraders from the worker target. Native integration must count bootstrap workers per target, not legacy sponsor-wide counts. Deliberate correction: terminal-only rooms are treated as bootstrap rooms instead of dereferencing absent storage.

Validation: npm run quality passed (274 production / 248 test files, zero Lizard violations); npm test passed 537 tests / 162 files in 4.67s. These are pure policy and recipe tests, not native bootstrap evidence. Next: separate bootstrap execution eligibility from ordinary worker population ownership, wire target-owned sponsor spawning and shared collection/work actions, then demonstrate actual post-reset rebuild and supply in the engine. ED-22 remains incomplete.


## Native bootstrap worker integration (ED-22, 2026-11-15)

The upgrade fleet now maintains target-owned `upgrade-bootstrap:<room>` workers through the configured sponsor and existing fleet hysteresis. The existing upgradeRoomEnabled / upgradeRoomSpawningEnabled switches control execution and demand respectively. Worker count is bounded by the configured upgradeFleetTarget minus target upgraders. Spawning/travelling workers count toward their target; unrelated targets do not. Queued bootstrap ownership is discoverable for cancellation when configuration or ownership changes. Ordinary population reconciliation still recognizes only ordinary work owners.

Bootstrap workers reuse the common cargo disposal, collection reservations, task execution, pathing, and work selection. Their per-unit settings enable builder work independently of ordinary workersEnabled and remove the ordinary storage/upgrade reserve. The collection observer allows these workers to withdraw retained owned storage/terminal stock even when structures are inactive after a controller reset. The native engine permits those withdrawals; the first scenario run exposed the old active-only filter. A full-suite run also caught removal of ordinary spawn dispatch activation during extraction; activation was restored and the worker-population replacement scenario passed.

The new packaged --upgrade-bootstrap scenario runs 150 ticks at RCL2 with retained inactive storage, an unfinished road and no seeded workers. It observes an actual spawn, energy collection, completed road and subsequent controller progress (64 in the targeted run), with one bootstrap worker and ordinary workers disabled. Targeted evidence: artifacts/engine-jNykY7/evidence.json. This establishes local bootstrap execution, not a full reset/reclaim/rebuild cycle or cross-room supply.

Remaining integration gaps: legacy bootstrap-specific energy ranking and raw-source harvesting fallback (role.builder.js 374-500); sponsor-to-target haulers and their RCL5 cutoff; full reset/claim/bootstrap with retained infrastructure; cross-room bootstrap travel/replacement; low-RCL master behavior; general assigned-room/CreateRoom operators; sustained mixed-colony recovery scenario. The current bootstrap collection uses the shared balanced profile, which is explicitly not yet exact legacy priority parity. ED-22 remains incomplete.


Regression finding: the full engine run exposed an intermittent upgrade-loss return failure, while an unchanged standalone rerun passed. Parking assignment had sorted random engine object IDs, producing different route arrangements. Native parking now supplies creep names as explicit stable ordering keys (identity remains the object ID); a unit regression verifies unchanged named assignments under changed IDs. The strict 160-tick eight-specialist return scenario passed with the stable order (artifacts/engine-otJVCJ/evidence.json). Final fast validation: 540 tests / 163 files in 4.23s; quality passed with 276 production / 250 test files and zero Lizard violations; CommonJS bundle validation passed.

Final complete native regression run: npm run test:engine:suite passed all 114 checks in 192.85s (artifacts/engine-suite.json). Includes the new bootstrap case and unchanged strict specialist parking/return, reset/reclaim, sponsored upgrader fleet, ordinary worker replacement, logistics, movement, and expected fault scenarios.


## Bootstrap collection and harvesting (ED-22, 2026-11-15)

Replaced the temporary balanced bootstrap profile with an explicit policy based on role.builder.js 374-500: energy-bearing remains, dropped energy above 70, storage, terminal, then containers above carry capacity. Shared quantity reservations still decide availability; native pickup must be able to collect the full amount the engine would take. Deliberate corrections: energy-only remains/container stock avoids selecting foreign minerals; nearest-distance and stable-ID ties replace incidental enumeration order. Tombstones share the existing remains adapter. The common empty/full collection phase is retained rather than the legacy early-work shortcut after a dropped pile above 200.

When no collection order is available, bootstrap workers select a source with energy before an empty one, then earliest regeneration among empty sources. Native harvesting composes the existing harvestStep and shared creep-action arbiter/movement. Selection is reconstructed each tick instead of persisting legacy assignedNode coordinates. Bootstrap upgrading no longer depends on retained storage having positive energy: harvested cargo can fund it even with empty storage. This is deliberately scoped to bootstrap ownership.

The new --bootstrap-harvest engine scenario spawns a worker, removes retained storage energy after the spawn starts, and observes harvesting, completed road, and controller progress over 250 ticks. The world defines one explicit source (removing the generated default source) for repeatable travel. Evidence: artifacts/engine-KxSd4O/evidence.json; source energy falls from 3000 to 2656, road completes, controller advances. The initial run caught the ordinary upgrade-reserve gate preventing bootstrap use of harvested cargo; corrected and rerun.

Remaining: sponsor supply haulers; combined reset/reclaim/rebuild and cross-room bootstrap; no-source/blocked-source operator dismantling path and assigned-room semantics; low-RCL master and end-to-end mixed-colony recovery. Harvesting fallback alone does not establish those requirements.

Validation: quality passed with 278 production / 251 test files and zero Lizard violations; all 543 tests / 164 files passed in 4.62s; bundle check passed. Targeted native cases passed: --bootstrap-harvest, --upgrade-bootstrap, --worker-collection, --worker-profile-builder and packaged smoke. The prior 114-case full suite is recorded above; the expanded 115-case suite was not rerun for this isolated bootstrap branch increment.


## Upgrade supply foundation (ED-22, 2026-11-15)

Extracted recovery's route commitment mechanism to features/logistics/transport-commitment.ts. Recovery policy still supplies its identity, priority and namespace; shared reconciliation bounds outstanding demand, accounts for other owners' commitments and preserves admitted cargo until settlement. New upgrade-supply policy owns a separate sponsor/target identity, energy-only storage endpoints, configurable sponsor reserve and batch, and legacy priority 88. The exact legacy specialist body is 17 MOVE / 33 CARRY (2500 energy, 1650 capacity); insufficient budgets produce no body rather than silently reducing it.

Tests cover competition with recovery requests for the same sponsor stock, repeated reconciliation, foreign destination cancellation, full body affordability and stopping a route while delivery is already reserved. Validation: npm run quality passed (280 production / 252 test files, zero Lizard violations); npm test passed 546 tests / 165 files in 4.31s. Existing --support-transport native regression passed after extraction, delivering 30 energy across the border and returning/reassigning the courier; artifacts/engine-8dIuOe/evidence.json.

This is domain foundation plus a recovery regression, not native upgrade supply evidence. Next: make courier route identity and endpoint observation injectable instead of hard-coded recovery policy; wire upgrade supply fleet demand (up to eight, priorities 88 + index*5) to upgradeBootstrapDemand.haulers, sponsor gate and storage endpoints; retain owned inactive target storage during low RCL; register native execution and prove spawn/travel/delivery/cutoff/cargo settlement. Avoid applying recovery's active-structure sink filter to retained upgrade-room storage. ED-22 remains incomplete.


## Composed upgrade supply courier (ED-22, 2026-11-15)

Extracted native-route-courier from native-support-courier with injected route identity, observation and movement policy version. Recovery remains a small composition wrapper. Upgrade supply now composes the same journal settlement, task selection/execution, orphan cargo recovery and empty-return/reassignment mechanism. Its endpoint observer checks sponsor/target ownership, exact storage IDs, energy resource and live sponsor reserve. Local hauling admission and recruitment exclude upgrade-supply ownership; malformed or wrong-sponsor routes are rejected.

Important correction to the preceding plan: low-RCL retained storage can be withdrawn from but cannot accept new deposits. Pinned engine storages/tick.js resets capacity to zero when the controller level does not allow storage. The first native RCL2 delivery probe observed free capacity become null, no delivery receipt, and preserved cargo. This was not a passing supply scenario (artifacts/engine-Ht8bfb/evidence.json). Legacy role.hauler.js 235-303 handles this via terminal at RCL6+, upgrade-master handoff, or dropping beside the return storage when transfer fails/no store is usable. That behavior must be implemented explicitly; merely bypassing isActive is insufficient. The existing generic courier retains cargo when no destination exists and therefore is not yet low-RCL supply parity.

Packaged --upgrade-supply-transport now proves the usable-storage branch at RCL4 with a seeded 50-capacity courier: 30 energy crosses the border with 70 retained at the donor, local courier remains excluded, receipt records delivery, and cancellation returns/reassigns the courier inside home. Evidence: artifacts/engine-YUm07x/evidence.json. It does not prove fleet recruitment, the 50-part body in native execution, low-RCL drops/master handoff, or RCL5 demand cutoff.

Validation: quality passed (284 production / 254 test files, zero Lizard violations); 548 tests / 166 files passed in 4.22s; bundle check passed. Native upgrade-supply-transport, support-transport, support-loss, support-reserve-change and automatic-support passed. Full expanded suite not rerun this increment.

Next: represent deliberate ground delivery and master handoff with explicit outcomes/receipts rather than pretending they are storage transfers; select terminal/master/ground destinations according to legacy capability; wire supply demand/configuration and native feature into composition; prove recruitment, low-RCL supply, RCL5 cutoff, cancellation with cargo and combined reset/reclaim/bootstrap.


## Supply destination policy (ED-22, 2026-11-15)

Traced role.hauler.js 73-92 and 235-303. Added explicit destination outcomes in upgrade-supply-destination.ts: RCL6+ terminal transfer/wait takes precedence; otherwise an available target-owned upgrade master receives transfer/wait; otherwise return storage accepts transfer when capacity exists, and zero/missing storage selects ground delivery at the configured return anchor. Lost/unseen ownership yields hold, never ground delivery. Full terminal/master waits rather than falling through to dumping cargo. Source selection preserves terminal preference below 70000 sponsor storage energy and exact equality behavior, correcting the legacy missing-terminal dereference.

Native observation is application composition (native-upgrade-supply-destination.ts), not a low-level adapter importing feature policy. It reads actual free capacity (null maps to zero), excludes spawning/wrong-home masters and chooses deterministically by name. Tests cover policy precedence, full endpoints, low-RCL storage, ownership loss, threshold boundaries and native observation.

Validation: npm run quality passed (286 production / 256 test files, zero Lizard violations); npm test passed 554 tests / 168 files in 5.55s. This is tested selection/observation, not delivery execution: ground drop confirmation and master/terminal task binding are not wired into the courier yet. No new engine claim is made. Next: implement explicit ground delivery journal/settlement, connect selection to route execution and recruitment, then native low-RCL handoff and full lifecycle scenarios.


## Ground release confirmation foundation (ED-22, 2026-11-15)

Added a ground-release confirmation capability separate from storage transfer receipts. A release requires immediately following-tick evidence: matching live unit and position, exact intended cargo reduction, unchanged hits, explicit isolation from interfering actions, and ground-pile quantity within the expected post-drop range allowing one decay step. Same-tick observation waits; missing/skipped/contradictory observations remain unknown. The injected decay divisor comes from engine semantics (energy/tick.js uses ceil(quantity / ENERGY_DECAY)); confirmation of release does not claim recipient pickup or persistent stock availability.

The ground-delivery journal persists attempts before any caller invokes a drop, blocks duplicate/reconstructed attempts until acknowledgement, binds to the unit ID, and acknowledges only confirmed released results. Unknown results cannot be acknowledged or silently retried. Native reconciliation/recovery for unknown results remains to be designed before runtime integration; retaining a blocked journal is a conservative foundation, not a completed operator path.

Validation: quality passed (288 production / 258 test files, zero Lizard violations); 559 tests / 170 files passed in 4.44s. Tests cover bounded decay, cargo-only false evidence, damage/replacement/movement/interference, skipped ticks, persisted reconstruction and acknowledgement. No native drop was executed in this increment. Next: native observation/isolation and duplicate-safe execution, actual engine drop/decay/reload cases, then bind ground release to upgrade supply delivery and fleet orchestration.


## Native journal-backed ground release (ED-22, 2026-11-15)

Added native ground observation and execution. The issuing path validates cargo/ownership, claims all ordinary economic/movement action slots for the tick, persists the ground attempt inside the admitted callback before creep.drop, and prevents pending attempts from being reissued even with a newly constructed dispatcher. An earlier action conflict does not create a pending attempt. A native exception leaves the attempt durable. The observation requires a visible live unit, reads the previous tick's events to exclude interfering unit/target events, snapshots cargo/hits/position and ground resources, and settles with the native ENERGY_DECAY value.

Packaged --ground-delivery seeds 80 energy on a courier and a 1000-energy ground pile, issues a 50-energy drop, attempts a duplicate through a reconstructed dispatcher, reloads actual bot code between ticks 1 and 2, and confirms the original release. Native results: cargo 80→30, pile 1000→1048 after release/decay, one original attempt, duplicate blocked, released amount 50 retained unacknowledged until its eventual consumer applies it. Evidence: artifacts/engine-MASUdD/evidence.json. The fixture initially omitted the harness-required operator configuration and was corrected; no production failure was concealed.

Validation: quality passed (290 production / 260 test files, zero Lizard violations); 562 tests / 171 files passed in 4.46s; bundle check passed; targeted native ground/reload scenario passed. Full expanded engine suite not rerun this increment.

Still required before upgrade supply integration: recovery policy for unknown or rejected native drops; connect release outcomes to ground-specific delivery demand (not storage transfer receipts); master/terminal bindings; native fleet/config registration; low-RCL supply and complete reset/reclaim/rebuild evidence. The isolated native drop capability is not yet an enabled upgrade-hauler behavior.


## Definitive ground rejection recovery (ED-22, 2026-11-15)

Ground journals now distinguish a definitive negative native return code from ambiguous execution. Native drop rejection records {status: rejected, code} and closes that attempt for retry on a later tick; same-tick reconstruction remains blocked by the persisted attempt tick. Rejected outcomes cannot be acknowledged as released receipts. Exceptions still leave pending evidence because execution may be uncertain; missing/skipped observations remain unknown and are not silently retried.

Validation: quality passed (290 production / 260 test files, zero Lizard violations); 563 tests / 171 files in 5.67s. Mocked native rejection regression proves negative-code recording, no receipt, same-tick suppression and later retry. Actual --ground-delivery code-reload/decay regression passed (artifacts/engine-R8EGcO/evidence.json); this native case exercises successful release, not engine rejection. Remaining: explicit unknown-result reconciliation and ground-demand settlement, then integrate with supply fleet and low-RCL room lifecycle.


## Unknown ground-result reconciliation (ED-22, 2026-11-15)

Added an explicit reconciliation outcome for unknown ground attempts. The caller must provide the same live unit's current cargo at a later tick; native recover reads it directly from the owned creep. Reconciliation records remaining cargo and observation tick without a delivered amount, and cannot be acknowledged as a released receipt. It closes the previous attempt for new work only after the reconciliation tick. New native drops remain bounded by actual current cargo. This does not retrospectively resolve the original delivery.

New --ground-recovery actual-engine case drops 50 from 80, reloads code, intentionally skips the immediate confirmation, observes unknown on tick 3, records cargo 30 through recovery, then drops only that remainder on tick 4 and confirms its 30-energy release on tick 5. Evidence: artifacts/engine-RQUwxH/evidence.json. Standard ground drop/reload case also passes (engine-p72q3h).

Validation: quality passed (290 production / 260 test files, zero Lizard violations); 564 tests / 171 files in 5.54s; bundle passed; targeted native ground-recovery and ground-delivery passed. Full expanded suite not rerun. Lizard initially caught complexity growth in issue/schema validation; extracted coherent validation helpers and reran successfully.

Next: supply orchestration must treat reconciled outcomes as uncertain consumption and plan from live stock/cargo, never confirm the unknown original request. Ground-specific demand accounting, master/terminal task binding, fleet/config registration, low-RCL supply, and combined reset/reclaim/rebuild remain outstanding.


## Native low-RCL supply cycle (ED-22, 2026-11-15)

Added a supply cycle composed from shared native transfer, transfer journals, quantity reservations, movement, destination policy and ground journals. It settles pending actions before planning from live cargo. Empty active couriers choose sponsor storage/terminal using the legacy source policy and reserve; loaded couriers dynamically choose terminal, master, storage or deliberate ground release. Full terminal/master waits. Lost target ownership returns cargo to owned sponsor storage. Empty cancelled couriers return inside the home room and hand ownership to ordinary hauling. This cycle is intended as the fleet executor; do not also invoke the older storage-request courier on the same unit.

Each native collection/transfer reserves real stock/capacity only for the actual intent tick. A ground drop is a ground release, not a fictitious storage request or storage receipt. The cycle uses live-cargo loops rather than generating an unreachable storage commitment at RCL2. Shared transfer unknown handling retires ambiguous attempts after settlement and plans from live cargo; ground unknown handling records the explicit reconciled result. Receipt evidence remains in the respective latest journals; no cumulative delivery metric is invented.

Actual --supply-cycle scenario: seeded 50-capacity courier collects 30 above donor reserve 70, crosses W0N1→E0N1, deliberately drops near retained inactive RCL2 storage, confirms released 30, then returns/reassigns after cancellation. Target storage stays at zero. Evidence artifacts/engine-UWCbMd/evidence.json. --supply-master uses the same route but confirms a 30-energy transfer to a target-owned master, with no ground pile; artifacts/engine-wG18ba/evidence.json.

Still required: fleet recruitment/config/main registration, native terminal/full-destination/ownership-loss scenarios, long-route and replacement evidence, journal retirement cleanup for dead supply units, and foreign-cargo recovery (currently explicitly blocked). The cycle is not yet registered in the production room runtime. Full reset/reclaim/bootstrap/rebuild remains outstanding.

Validation: quality passed (293 production / 261 test files, zero Lizard violations); all 564 tests / 171 files passed in 4.63s; bundle check passed; complete expanded native suite passed 120 checks in 208.36s (artifacts/engine-suite.json). This supersedes the older 114-case aggregate and includes all intervening bootstrap, supply transport, drop/recovery and low-RCL cycle scenarios.


## Ground journal lifecycle retirement (ED-22, 2026-11-15)

Ground journals now retire through the existing creep identity lifecycle callback alongside transfer journals. Retirement receives the old native ID, preserving a replacement creep that reuses the same name. Nonempty journals are archived before removal under ground-retired/empire; the archive retains at most 50 identities and counts discarded older entries. Pending, ambiguous and reconciled results remain evidence as recorded, without fabricated confirmation. Empty journals are removed without archive growth. An interrupted deletion replays idempotently because the archive entry already exists.

Validation: quality passed (294 production / 262 test files, zero Lizard violations); 567 tests / 172 files passed in 4.49s. New lifecycle tests cover old/new identity isolation, archive-before-delete interruption, empty state and bounded retention. Existing --retirement native scenario passed (artifacts/engine-ESRzE2/evidence.json); it is a general lifecycle regression, not a new native dead-ground-hauler scenario. Full 120-case engine aggregate from the preceding milestone was not rerun.

Remaining before supply runtime registration: foreign-cargo task ownership/settlement, fleet/config/recruitment and dedicated terminal/full/loss cases. Combined reset/reclaim/bootstrap/rebuild and the rest of ED-22 remain incomplete.

## Supply foreign-cargo recovery (ED-22, 2026-11-15)

Supply couriers now unload non-energy cargo at their owned sponsor before resuming energy work. The extracted native-supply-cargo module reuses shared cargo destination ranking (terminal headroom, storage, terminal fallback, container), shared movement and the supply transfer journal. No hauling task queue is introduced, so a second executor cannot acknowledge the cycle's receipt. Resource selection is deterministic; reservations use the actual resource and shared sink capacity. Pending supply effects settle first. Full/missing destinations retain cargo and retry; no implicit mineral drop. The plan accepts terminalFreeReserve, default zero until runtime configuration is wired. Admission now also checks native ownership and logical home.

Actual --supply-cargo starts with 20 hydrogen and 10 energy, confirms 20 hydrogen delivered to sponsor storage, releases the initial 10 energy in the target, collects only 30 above sponsor reserve 70, releases that additional 30, and returns/reassigns after cancellation. Evidence artifacts/engine-gROCM8/evidence.json. --supply-cargo-hold fills the sponsor store: all 40 observed ticks retain both cargo resources, no transfer/drop journal is opened, and the route owner remains unchanged (artifacts/engine-SCYKWJ/evidence.json).

Validation: quality passed (295 production / 262 test files; zero Lizard violations); 567 tests / 172 files passed in 4.46s. Native ground and master supply regressions also passed after extending the fixture to 40 ticks. The prior full 120-case aggregate was not rerun; two new cases are registered for the next full run. Runtime/fleet integration, terminal/ownership-loss and long-route replacement scenarios, and combined reset/reclaim/bootstrap/rebuild remain incomplete.

## Production supply runtime and recruitment (ED-22, 2026-11-15)

The normal main loop now registers a dedicated upgrade-supply room feature. Route discovery combines visible configured targets with queued requests and live route-owned couriers, so disabling configuration or losing target vision does not orphan an existing route. Assessment reuses bootstrap supply demand and the shared empire-energy hysteresis. The target's configuration selects its sponsor; self-supply routes are excluded.

Target-room settings:
- upgradeRoomEnabled and upgradeSupplyEnabled enable supply operation; supply defaults off.
- upgradeSupplySpawningEnabled independently allows recruitment; defaults off.
- upgradeRoomSponsor names the physical sponsor and supply courier logical home.
- upgradeSupplyTarget is an integer 0�8, default 8.
- upgradeSupplyReserve is retained source energy, integer 0�1,300,000, default 0.
- upgradeFleetStartEnergy/StopEnergy and upgradeFleetStorageFloor retain the shared legacy hysteresis and storage gates.
- terminalFreeReserve controls foreign-cargo destination preference.

Recruitment uses the exact 2,500-energy 17 MOVE / 33 CARRY body, never a silently smaller body. The common roster reconciler counts spawning, travelling and low-TTL units until actual death, keeping a fixed roster; predictive replacement on long routes is not yet evidenced. Sponsor identity remains distinct from target-owned bootstrap and upgrade workers. An unaffordable body, disabled spawning, lost target ownership or stopped demand cancels this route's pending requests without touching other owners. Already loaded units finish delivery or return cargo on ownership loss, then empty cancelled units return inside the sponsor and become ordinary haulers. Disabling recruitment alone leaves existing service active.

When the destination is visible, the anchor is retained storage position or controller position; unseen targets use room centre only as an approach waypoint and are reassessed on visibility. Planning integration should replace this fallback with the persisted room plan. No storage means no new legacy supply demand.

Actual --supply-fleet uses the production main loop, no seeded creeps, a sponsor spawn and 26 extensions. It pays exactly 2,500 energy, creates one full-size courier, travels into the RCL2 target, confirms a 30-energy ground release while retaining donor reserve 70, and after disabling supply returns/reassigns to ordinary hauling. Evidence artifacts/engine-ECfDKJ/evidence.json, 270 ticks. Fixture corrections: skip journal observation before a newly spawning creep receives its native ID; keep enough sponsor spawn/extension energy after recruitment to avoid passive regeneration obscuring the measured cost.

Quality passed (298 production / 264 test files, zero Lizard violations); 571 tests / 173 files passed in 5.34s. Added behavior tests cover queue cancellation, unaffordable body, target ownership loss, disabled-route discovery without vision, sponsor identity and configuration bounds. Complete native suite passed 123 checks in 219.51s (artifacts/engine-suite.json).

Outstanding: native terminal/full-destination/loss and queued cancellation cases, sponsor-loss recovery, persisted plan anchors, long-route replacement, low-RCL master recruitment, and combined reset/reclaim/bootstrap/rebuild. ED-22 is not complete.

Final legacy comparison preserved recruitment priorities 88 + roster index * 5 (spawner.js 1782�1811). Route-specific counting deliberately corrects the legacy room-wide hauler count: unrelated couriers no longer suppress supply recruitment. This priority-only correction was made after the 123-case run; final quality/fast checks and the native supply-fleet case were rerun before commit.


## Native supply endpoint and cancellation evidence (ED-22, 2026-11-15)

Four new native engine scenarios cover the remaining terminal/target-loss boundaries:

- --supply-terminal: an RCL6 target has terminal, available storage and an available master. All 30 energy goes to the terminal, with a confirmed native transfer and no fallback/ground release (artifacts/engine-eJRxXb/evidence.json).
- --supply-terminal-full: the terminal starts full of mineral. The courier retains its 30 energy while blocked. External mineral removal opens 10 capacity, then 20 more; exactly two confirmed deliveries of 10 and 20 complete the route. Storage/master remain empty and no ground pile is created (artifacts/engine-puqSaM/evidence.json). The fixture updates the complete store object while preserving its observed energy; a first dot-path update did not change mock storage and correctly left the courier blocked.
- --supply-target-loss: after native collection and before target delivery, the target controller loses ownership. The loaded courier confirms 30 energy returned to sponsor storage, restoring source stock to 100, then returns to ordinary hauling; target terminal/storage/master and ground receive nothing (artifacts/engine-k4bl4F/evidence.json).
- --supply-fleet-loss: normal production main queues a full supply courier while the sponsor lacks spawn energy. Target ownership is removed before restoring 2,900 sponsor spawn/extension energy. The queue is cancelled and no unit spawns across 12 ticks (artifacts/engine-lQV0oP/evidence.json).

The first three exercise the real native cycle with controlled admission; queued cancellation exercises the production feature and scheduler. These scenarios exposed fixture issues, not a required production-code correction. Terminal exclusive priority and bounded delivery were already implemented.

Quality passed (298 production / 264 test files; zero Lizard violations); 571 fast tests / 173 files passed in 5.25s. New cases and existing ground-cycle/production-fleet regressions passed. Four scenarios are registered for the next full suite; the prior aggregate remains 123 checks and was not rerun for this fixture-only increment.

Still outstanding: sponsor-loss recovery, long-route replacement, persisted plan anchors, low-RCL master recruitment, combined reset/reclaim/bootstrap/rebuild and remaining ED-22 colony parity.


## Supply sponsor-loss recovery (ED-22, 2026-11-15)

Fixed an actual runtime scheduling gap: the owned-room supply feature stopped servicing couriers after their sponsor became unowned. A separate visible-room feature now scans couriers by physical location. A visible controller that is no longer ours records a route-bound upgradeSupplyRecovery marker in creep memory; mere lack of visibility never proves loss. The marker survives subsequent loss of sponsor vision. It is removed after successful reassignment, and the normal supply cycle refuses marked units to avoid competing execution.

Recovery settles the existing supply transfer/ground journal before moving or changing identity. Refuge selection uses owned visible rooms with logistics enabled and the shared cargo-destination policy for every carried resource; distance and room-name tie-breaking are deterministic. Without a refuge the courier retains cargo and ownership and retries. Shared movement brings the courier inside the selected room, then ordinary logistics takes ownership and performs confirmed cargo recovery. This keeps local hauling's four-room route limit out of the long approach: recovery movement supports up to sixteen rooms before handoff. This limit is configuration of existing movement, not evidence of a tested sixteen-room route.

Visible lost sponsors cancel only their queued supply requests. Other owners remain untouched. Once a loss is recorded, a later reacquisition does not silently restart that route on the recovering unit; it completes recovery into an eligible owned logistics room.

Actual --supply-sponsor-loss executes normal main: tick1 collects30; sponsor ownership is removed before next-tick confirmation; the pending withdrawal is still confirmed and acknowledged. No refuge has logistics enabled until tick10, so the courier retains30 without dropping it. Once enabled, it moves to E0N1, becomes ordinary hauling and confirms all30 deposited into storage. Source remains70, destination30, cargo0 and recovery marker is cleared (artifacts/engine-HoXnj7/evidence.json). No seeded cargo or synthetic delivery receipts.

Unit tests cover unseen sponsor non-loss, recovery surviving sponsor vision loss, delayed refuge eligibility and owner-scoped queue cancellation. Quality passed (300 production /266 test files; zero Lizard violations);574 tests/174files passed in4.47s. Complete expanded native suite passed all128 checks in225.50s (artifacts/engine-suite.json), including the four endpoint/cancellation cases added in the previous increment.

Remaining: long-route replacement/soak and refuge route-availability cases, persisted plan anchors, low-RCL master recruitment and combined reset/reclaim/bootstrap/rebuild. Sponsor loss without any observed ownership-loss tick remains unknown and deliberately does not trigger reassignment.
