# Runtime configuration

ED-15 implementation in progress. resolveConfig takes explicit layer inputs and a tick; it reads no game globals or process environment. Precedence: defaults, environment, empire, roomProfile, roomOverride, temporary. The composition root will supply the selected room profile and persistent/operator layers. This resolver is not yet wired into the game loop.

Each effective key reports its winning source. Unknown keys, invalid enum/range/type values and invalid ticks throw with layer/key context. False and zero are valid when their declared domain permits them. Temporary overrides apply only while tick < expiresAt. Expired patches are still validated. Values and source maps are frozen, including cloned allies arrays, so one caller cannot alter another room's resolved configuration.

Initial settings: backgroundEnabled=true, backgroundCpuFraction=0.5 (0..1), minimumBucket=1000 (integer 0..10000), layoutStrategy=auto (auto/standard/constrained/stamps), allies=[]. Feature-specific settings will be introduced with their owning capabilities instead of creating speculative knobs. Diplomacy configuration is data; no username is hard-coded.

Local checks: quality passed with zero Lizard violations; configuration + smoke 13 tests passed in 228ms. Remaining ED-15: composition wiring, bounded tick observations, scheduler budget/fairness and fault isolation. ED-12 remote CI evidence is still open; its validated local gates are used for this work.
