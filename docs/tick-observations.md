# Tick observations

world/observe builds shared indexes from a narrow ObservationSource. It reads visible room names once, deduplicates them, observes each once and indexes owned rooms, own units, configured allies, other units as potential threats and structures by type. Diplomacy is supplied per room, not embedded in usernames. Detailed combat threat assessment remains the defense capability's responsibility.

createTickObserver caches the view for one tick only. The next tick rebuilds observations; unseen rooms disappear from this ephemeral view without mutating persistent memory. Room observation/configuration exceptions preserve the original error and room name while independent rooms continue. A failure to enumerate visible rooms remains a top-level adapter failure. Index types are readonly to consumers; they are not a serialized copy of the game world.

The Screeps adapter stores only IDs, type, ownership and owner name. It queries creeps/structures once per visible room. Feature adapters will resolve IDs for intents and specialized observations. Normal creeps and power creeps are both indexed, including hostile power units. Specialist power behavior remains feature work. No real-engine execution is claimed. Scans scale with visible entities; bounded workload measurements belong to ED-43.

Quality passes. Adapter/observation/smoke: 6 tests passed in 201ms. Contract tests verify category scan counts, copied metadata, power-unit threats, structure ownership and visibility errors. Composition integration remains ED-15 work.

