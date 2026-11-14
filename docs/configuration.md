# Runtime configuration

ED-15 implementation in progress. resolveConfig takes explicit layer inputs and a tick; it reads no game globals or process environment. Precedence: defaults, environment, empire, roomProfile, roomOverride, temporary. The composition root will supply the selected room profile and persistent/operator layers. This resolver is not yet wired into the game loop.

Each effective key reports its winning source. Unknown keys, invalid enum/range/type values and invalid ticks throw with layer/key context. False and zero are valid when their declared domain permits them. Temporary overrides apply only while tick < expiresAt. Expired patches are still validated. Values and source maps are frozen, including cloned allies arrays, so one caller cannot alter another room's resolved configuration.

Initial settings: backgroundEnabled=true, backgroundCpuFraction=0.5 (0..1), minimumBucket=1000 (integer 0..10000), layoutStrategy=auto (auto/standard/constrained/stamps), allies=[]. Feature-specific settings will be introduced with their owning capabilities instead of creating speculative knobs. Diplomacy configuration is data; no username is hard-coded.

Local checks: quality passed with zero Lizard violations; configuration + smoke 13 tests passed in 228ms. Remaining ED-15: composition wiring, bounded tick observations, scheduler budget/fairness and fault isolation. ED-12 remote CI evidence is still open; its validated local gates are used for this work.

Owned-room mining is registered in production but opt-in during the rewrite: miningEnabled defaults to false; miningBodyBudget defaults to 800 and accepts integer values 200..10000. Set these through the existing empire/profile/room override layers. This activates energy mining and spawn demand only; hauling/bootstrap, complete safety policy and release validation are still being implemented.

mineralMiningEnabled (boolean, default false) enables owned-room mineral demand when miningEnabled is also true. New demand requires a known container and active extractor, uses one miner per station, and receives lower spawn priority than energy mining. It shares miningBodyBudget. Disabling mineral work pauses its worker execution while threat retreat still takes precedence.

logisticsEnabled (default false) enables execution of queued logistics requests by explicitly owned room couriers. It currently does not create requests or spawn couriers. See docs/logistics.md for identity, integration and pause/recovery limitations.

energyRequestsEnabled (default false) adds owned-room spawn/extension requests when logisticsEnabled is also enabled. Sources are containers and owned storage/terminals. Initial generation policy and remaining resource/fallback scope are documented in docs/logistics.md; courier population is not yet automatic.

courierSpawningEnabled (default false) enables bootstrap courier demand when logisticsEnabled is active. courierBodyBudget defaults to 300 (integer 100..2600); the first courier is limited by currently available room energy. Native sizing is currently a pending-work bootstrap floor; measured route throughput integration remains unfinished. Disabling either logistics or courier spawning cancels its unissued spawn requests.
