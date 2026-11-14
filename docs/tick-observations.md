# Tick observations

world/observe builds shared indexes from a narrow ObservationSource. It reads visible room names once, deduplicates them, observes each once and indexes owned rooms, own units, configured allies, other units as potential threats and structures by type. Diplomacy is supplied per room, not embedded in usernames. Detailed combat threat assessment remains the defense capability's responsibility.

createTickObserver caches the view for one tick only. The next tick rebuilds observations; unseen rooms disappear from this ephemeral view without mutating persistent memory. Room observation/configuration exceptions preserve the original error and room name while independent rooms continue. A failure to enumerate visible rooms remains a top-level adapter failure. Index types are readonly to consumers; they are not a serialized copy of the game world.

The Screeps adapter stores only IDs, type, ownership and owner name. It queries creeps/structures once per visible room. Feature adapters will resolve IDs for intents and specialized observations. This initial adapter does not yet index power creeps; that specialist path must be added with advanced capabilities, before parity closure. No real-engine execution is claimed. Scans scale with visible entities; bounded workload measurements belong to ED-43.

Quality passes. Observation+smoke: 4 tests passed in 198ms. Composition integration and adapter contract tests remain ED-15 work.
