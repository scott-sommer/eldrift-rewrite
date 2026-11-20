# Runtime configuration

resolveConfig takes explicit layer inputs and a tick; it reads no game globals or process environment. Precedence: defaults, environment, empire, roomProfile, roomOverride, temporary. The composition root supplies the selected room profile and persistent/operator layers through the game loop.

Each effective key reports its winning source. Unknown keys, invalid enum/range/type values and invalid ticks throw with layer/key context. False and zero are valid when their declared domain permits them. Temporary overrides apply only while tick < expiresAt. Expired patches are still validated. Values and source maps are frozen, including cloned allies arrays, so one caller cannot alter another room's resolved configuration.

Initial settings: backgroundEnabled=true, backgroundCpuFraction=0.5 (0..1), minimumBucket=1000 (integer 0..10000), layoutStrategy=auto (auto/standard/constrained/stamps), allies=[]. Feature-specific settings will be introduced with their owning capabilities instead of creating speculative knobs. Diplomacy configuration is data; no username is hard-coded.

Local checks: quality passed with zero Lizard violations; configuration + smoke 13 tests passed in 228ms. Remaining ED-15: composition wiring, bounded tick observations, scheduler budget/fairness and fault isolation. ED-12 remote CI evidence is still open; its validated local gates are used for this work.

Owned-room mining is registered in production but opt-in during the rewrite: miningEnabled defaults to false; miningBodyBudget defaults to 800 and accepts integer values 200..10000. Set these through the existing empire/profile/room override layers. This activates energy mining and spawn demand only; hauling/bootstrap, complete safety policy and release validation are still being implemented.

mineralMiningEnabled (boolean, default false) enables owned-room mineral demand when miningEnabled is also true. New demand requires a known container and active extractor, uses one miner per station, and receives lower spawn priority than energy mining. It shares miningBodyBudget. Disabling mineral work pauses its worker execution while threat retreat still takes precedence.

logisticsEnabled (default false) enables execution of queued logistics requests by explicitly owned room couriers. It currently does not create requests or spawn couriers. See docs/logistics.md for identity, integration and pause/recovery limitations.

energyRequestsEnabled (default false) adds owned-room spawn/extension requests when logisticsEnabled is also enabled. Sources are containers and owned storage/terminals. Initial generation policy and remaining resource/fallback scope are documented in docs/logistics.md; courier population is not yet automatic.

courierSpawningEnabled (default false) enables bootstrap courier demand when logisticsEnabled is active. courierBodyBudget defaults to 300 (integer 100..2600); the first courier is limited by currently available room energy. Native sizing combines a pending-work bootstrap floor with static per-station route estimates for safe, visible owned-room container mining. Remote routing and measured traffic delays remain unfinished. Disabling either logistics or courier spawning cancels its unissued spawn requests.


Link courier service is opt-in with `linkServiceEnabled: true` alongside `logisticsEnabled` and `linksEnabled`. `linkStorageTarget` is a validated fraction (default 0.75), while `linkStorageAssistTrigger` controls controller need. The service creates bounded fill/drain work for existing couriers; courier spawning remains separately controlled. Disabling service cancels unassigned service requests and lets admitted cargo settle.

`mineralTransportEnabled` (default false) enables mineral-adjacent container transport when logistics is enabled. `terminalFreeReserve` (0–300,000) and `storageFreeReserve` (0–1,000,000) reserve destination headroom, defaulting to 50,000 each. Terminal is preferred and storage is the fallback. These limits govern generated transport requests; they do not reserve physical space against unrelated external writers.

For idle mineral cargo recovery, `terminalFreeReserve` controls terminal preference (strictly above the threshold). It is not a hard reservation in recovery: storage ranks first at/below the threshold, with other durable capacity retained as fallback. Planned mineral-container transport separately enforces its configured headroom.

`energyBankingEnabled` (default false) enables source-adjacent container energy transport into storage, then terminal. It uses the configured storage/terminal free-capacity reserves and existing couriers. Enable `courierSpawningEnabled` for automatic courier provisioning. Consumer requests generated in the same pass receive priority before banking; already admitted banking work is allowed to finish.

`storeBalancingEnabled` defaults false. Normal balancing uses `terminalEnergyLow`20,000, `terminalEnergyHigh`30,000 and `storageEnergyReserve`70,000; low must be strictly below high. It fills low terminal energy, exports stored minerals and drains surplus terminal energy in bounded batches, respecting destination capacity headroom. One pending balancing service request prevents opposite simultaneous work within this policy.

`storeBalanceMinimumEnergyFraction` defaults to0.75 and accepts0–1. Normal balancing starts only when room spawn/extension energy is strictly above that fraction of positive capacity. Low energy retires unassigned balancing requests before courier admission; already reserved cargo finishes. A value of1 suppresses new normal balancing work.

### Explicit recovery donors

`energyReclamationEnabled` defaults to false and takes effect with `energyRequestsEnabled` and `logisticsEnabled`. It permits energy in owned, active labs and links to supply owned, active spawns/extensions. Donors cannot supply towers or durable stores through this policy; minerals are never reclaimed. Normal energy sources remain preferred. This is an explicit donor capability, not automatic starvation detection: ED-22 still owns recovery entry/exit hysteresis, reassignment and coordination with industry/link policy.

Turning it off stops further donor generation. The ordinary request reconciliation retires unreserved donor requests; already admitted work may finish safely. Generation currently follows courier execution, so disabling is not an immediate pre-admission cancellation barrier. Shared quantity claims prevent link transfers or other couriers from spending already reserved donor energy; they do not guarantee recovery wins scheduling priority over native links.

### No-storage work supply

`workerSupplyEnabled` defaults to false. With logistics enabled, it supplies a nearby controller container before eligible local workers when the room has no owned storage and no observed spawn/extension/tower deficit. `controllerContainerTarget` defaults to 1900 (integer 0..2000). The nearest container within three controller tiles is the reserve; its stock is excluded from fallback collection, preventing refill/drain cycles. A reserve full of other resources permits worker fallback.

Workers must carry the explicit `population` ownership identity from `workOwner(room)` and matching home room; body parts and historical role names are not sufficient. Only owned, non-spawning, local workers with more than 25 free energy capacity are recipients. ED-22 will create and maintain these workers and execute their work independently. This policy does not implement work execution or dedicated Upgrade Rooms. Disabling reconciles unassigned work at normal generation time; admitted deliveries may complete. Mobile recipient disappearance currently relies on bounded request expiry if visibility cannot establish loss.

Recovery donor settings: recoverySupportEnabled (default true), recoverySupportReserve (0), recoverySupportBodyBudget (2600), recoverySupportTravelTicks (200), recoverySupportLifetime (1500). Support only starts for targets with recoveryEnabled and recoveryEconomyEnabled; target-specific thresholds and batch govern its demand. Reserve0 preserves legacy behavior; configure positive reserves per donor. Travel ticks are a conservative configurable replacement lead, not measured route latency. See recovery-support.md for runtime ownership and engine evidence.

workerCargoDropFallback defaults to true. Workers first deposit non-energy cargo through shared cargo recovery; if no compatible destination exists, true permits a mineral drop to free work capacity, while false retains cargo and waits. Energy is excluded from this disposal policy. Pending transfer settlement and unrelated task ownership take precedence over fallback.

Upgrade-room service is opt-in via upgradeRoomServiceEnabled=false by default, alongside logisticsEnabled. Defaults: upgradeLabMineralTarget=1300, upgradeSpawnEnergyFloor=100, upgradeStorageEnergyCeiling=990000, upgradeServiceBatch=200. These settings govern specialist mineral/energy shipments through local couriers; courierSpawningEnabled supplies automatic fleet demand. The service pauses new work during recovery and takes precedence over ordinary store balancing. It does not yet enable renewal, boosting or unclaim/reclaim. See upgrade-rooms.md for boundaries and evidence.

### Native planning

Planning is registered as owned-room background work and remains opt-in through planningEnabled=false. It uses the normal configuration precedence, bucket admission and background CPU fraction. Disabling pauses further work without deleting progress or the committed plan. It does not create construction sites.

Operational defaults: planningCpuBudget=5, planningCandidateAttempts=100, planningEvaluationSteps=1, planningSearches=1. These are cooperative allowances, not a demonstrated hard CPU ceiling; native cold preparation/persistence remains synchronous. planningPreserveExisting=true locks valuable owned structures; planningAnchorLimit=36 bounds constrained and stamp hub anchor search. layoutStrategy selects auto/standard/constrained/stamps. Auto compares all three strategies through common validation and scoring. planningRefreshRevision=0 can be incremented to request a fresh plan.

Score controls (each finite 0..1,000,000) are planningHaulingWeight=1, planningServiceWeight=1, planningCapacityWeight=1000, planningSwampWeight=1, planningDefenseWeight=1 and planningMigrationWeight=0.001. They weight measured completed routes, missing capacity, swamp footprint, barrier count and nominal construction/retirement energy respectively. These initial tunable defaults are not an empirically optimized balance. planningMinimumImprovement=10 uses the same weighted-score units for switching hysteresis. planningMaximumPathOps=10000 accepts integers 1..100000 and bounds each native path search; incomplete paths reject candidates.

The current production policy uses the characterized perimeter/controller fallback at RCL6. Native score preparation and fresh commit validation bind policy changes to request identity. Main-loop activation/disable behavior has real-engine evidence; complex-room coverage, sustained default-budget completion, soak performance and earlier-RCL defense safety still require qualification. The 400-tick planning-room scenario demonstrates a complete plan from native observations in one open-terrain owned room using an explicitly larger work allowance. The 80-tick planning-budget scenario now demonstrates full enumeration and evaluation progress with unchanged default budgets; it does not establish a hard CPU ceiling.

## Stamp search budgets

Stamp composition exposes three settings through the existing empire, room and
temporary override layers:
- planningStampAnchorLimit: default 200, integer 1..2500; candidate positions per stamp.
- planningStampAttemptsPerStep: default 100, integer 0..1000000; placement attempts per evaluator call. Zero pauses placement advancement.
- planningStampTotalAttempts: default 100000, integer 1..1000000; cumulative placement ceiling for a composition.

The outer hub candidate count still uses planningAnchorLimit. Shared CPU guards
and road-search budgets remain applicable. Per-step changes preserve checkpoint
identity; anchor-domain and cumulative-ceiling changes restart the request and
invalidate stale proposals while retaining the committed plan. These settings
bound placement attempts, not total CPU consumed by checkpoint replay or routing.


## Construction execution

`constructionEnabled` defaults false and activates retained committed-plan reconciliation independently of `planningEnabled`. Owned rooms only; remote authorization is separate unfinished policy. Normal environment/empire/room/temporary layers apply.

Defaults: `constructionCpuBudget=3`, `constructionEntries=20`, `constructionAttempts=1`, `constructionRoomSites=5`. Admission is cooperative; CPU value is not a hard elapsed-time ceiling. `constructionIncludeTerminalEnergy=false` means only owned storage energy satisfies a plan entry's minimumStoredEnergy requirement.

Error retry controls: `constructionRetryAttempts=3`, `constructionRetryDelay=10`, `constructionRetryMaximumDelay=1000`; maximum delay must cover initial delay. Quarantine stops engine calls until desired-plan/policy refresh or observed site/structure presence. Runtime lifecycle/native qualification remains ED-27 work; see construction.md.


## Ordinary upgrader approach distance

workerUpgradeApproachRange is an integer1–3, default2. It applies when workerMode=upgrader and workerEnergyProfile=upgrader; balanced, builder, fortifier and upgrader-v2 work retain action range3. Upgrade-room station geometry remains separately owned. A room override of3 preserves the old W3N58 exception without a hardcoded room name in runtime code. ED-44 must translate any retained legacy configuration deliberately; no automatic legacy memory import occurs.

An upgrader already within API range3 can issue its upgrade while moving toward the preferred distance on the same tick. Positioning shares the task owner and movement boundary. Rejected or blocked work does not issue an extra positioning request. Build/repair distances remain3. A preferred distance is a policy goal, not permission to cross blocked terrain or issue conflicting actions.


## Visible-room intel capture

`intelEnabled=false` by default. Per-room activation consumes existing vision; it does not spawn scouts or command observers. `intelCaptureInterval=50` sets periodic refresh and capture-failure cooldown. `intelMaximumAge=5000` marks retained detail stale; stale/unknown detail is eligible earlier than the periodic interval. Freshness zero is valid.

The shared empire job uses `intelCaptureCpuBudget=3`, `intelCaptureRooms=4` (attempts, including failed/hidden captures), and `intelCaptureScans=32` (candidate metadata scans). These limits may only be set in environment/empire configuration; profile, room and temporary overrides reject. Zero for any shared limit pauses capture. CPU admission is cooperative: a room snapshot/write can finish after the deadline. Room backgroundEnabled, minimumBucket and backgroundCpuFraction still gate that room's capture. A persisted cursor rotates service across the visible set and survives resets; unobserved rooms remain unknown rather than receiving empty snapshots.


## Native scouts

scoutsEnabled and scoutSpawningEnabled both default false. scoutAssignedRooms supplies an ordered physical-visit list; exhausted lists fall back to freshness-aware exploration. scoutCount=1 is an effective fleet target under shared replacement timing. scoutMinimumRcl=2 gates automatic recruitment. Local/extended depth defaults2/4, with extended depth at RCL4 or scoutExtendedProgress=0.1 through RCL3. All scout policy settings accept normal room/profile/temporary layers; see scouts.md and config/scouts.ts for validated bounds.

scoutPlanCpuBudget=3 is shared by recruitment/assigned assessment/fallback consumers for a home/tick, with existing background/bucket/fraction admission. scoutControlCpuBudget=5 bounds admission to a current-room unit batch; oldest persisted execution ticks receive priority, and zero pauses control. Atomic captures/path queries can finish after the allowance. scoutDemandInterval=10 limits optional unassigned discovery refresh; cancellation and expired-owner cleanup still run promptly. Explicit spawning disablement cancels own requests; an incomplete/paused plan preserves valid outstanding demand. Threat/routing/entry/death-window controls remain separate from population ownership and actual dispatch.


## Observer vision

observersEnabled defaultsfalse. observerAssignedRooms is an ordered per-home list; observerRefreshInterval=1 preserves continuous single-target capability, observerRequestLifetime=25 bounds requests, and observerFailureDelay=25 spaces unsuccessful assigned attempts. Specialists submit explicit owner/id/home/room/priority/expiry requests through the same observation owner.

observerCpuBudget=3, observerVisionBudget=4, observerCaptureBudget=4 and observerScanBudget=32 are shared environment/empire-only budgets. Per-home background/bucket/fraction policy gates new vision; pending next-tick capture remains urgent within the observer limits. See observers.md for lifecycle, caps and the difference between observation receipts and physical visits.


scoutFallbackFlag='' disables the optional scout flag goal. A nonblank selector (maximum100characters) matches flag names by substring in stable name order. It follows normal room/profile/temporary scope. Safe matching goals can sustain bounded scout demand with zero discovery depth; existing objectives and danger evasion take precedence. All fallback movement uses the shared scout route/movement boundary. Public per-creep flag-memory translation remains ED-39/44.


### Automatic worker boosts

`workerBoostPolicy` defaults to `off`. With ordinary workers and spawning enabled, `optional` selects affordable legacy upgrader/builder boosts or deliberately creates an unboosted worker; `required` waits for a complete kit before creating that request. `workerBoostTimeout` defaults to 200 and accepts 1–1500 ticks after ordinary body spawn duration. Policies apply to new requests; queued contracts and required failures retain their original ownership. See [worker boost policy](worker-boost-policy.md) for resource floors, stock promises, readiness and rollback details.


### Lab console operations

`require('main').industry.labs` exposes `inspect`, `configure`, `clearOverride`, `temporary` and `clearTemporary` over existing lab settings. Mutations require current room ownership and preserve unrelated layers/temporary deadlines; gameplay adopts changes at its next configuration snapshot. See [operator lab policy](operator-labs.md) for usage, cancellation/expiry behavior and qualified limits.


### Dedicated boost-lab buffers

`labBoostRoles` defaults to `[]`; each of at most ten distinct lab records specifies `lab`, `resource`, `mineral` (0–3000) and `energy` (0–2000). These minimum buffers preload through ordinary hauling and stay out of reaction roles. Changes/removal wait for admitted work and pinned boosts to settle. See [boost-lab roles](industry-boost-lab-roles.md) for ownership, scheduler prerequisites and the new persistent namespace/rollback obligations.


The lab API also exposes `previewBoostRoles(home, buffers, options?)` and `assignBoostRoles(...)` to select IDs automatically. It excludes manual reserved IDs, preserves a viable reaction network by default when reactions are enabled, and writes only a complete feasible existing `labBoostRoles` policy. See [automatic allocation](boost-lab-allocation.md) for tradeoffs and refusal behavior.
