# Runtime configuration

ED-15 implementation in progress. resolveConfig takes explicit layer inputs and a tick; it reads no game globals or process environment. Precedence: defaults, environment, empire, roomProfile, roomOverride, temporary. The composition root will supply the selected room profile and persistent/operator layers. This resolver is not yet wired into the game loop.

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
