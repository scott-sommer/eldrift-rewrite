# Paid task, movement and transfer composition

ED-29 runtime source: `c51373b646700031a1b792d3d6516dd778cececf`.

## Shared owners

`capabilities/movement/fixed-step.ts` is extracted from the existing native fixed follower. Both native and forecast movement now use the same binding, mobility, geometry, room-policy and movement-step mechanism. The native adapter supplies SDK observations and retains its public API.

`hauling-state/movement` wraps activated paid route programs in one private traffic frame. Service requests translate planned names to native IDs and the current task action owner. Outside movers and stationary occupants are explicit inputs to the same traffic solver; a route becoming ready does not request movement. All accepted movements must pass the shared world action arbiter before predicted positions are committed. An ownership conflict invalidates the private frame rather than returning financial progress from a partial simulation. Next-frame observations must match predicted position/fatigue, and only then acknowledge route cursor progress. Cargo phase transitions use the existing route-program observer. Spawning placement remains the birth/world owner's responsibility; outside movement cannot reuse a paid body's ID.

`hauling-state/observation.ts` reads the private task, request and journal owners and resolves the current physical opening. Native and forecast observers share task-progress and stage calculation. Pending effects use inventory events; completed tasks retain their completion-frame delay and unfinished requests can continue across loads. Transfer approach now receives the actual hauling binding instead of reconstructing task ownership. The inventory exposes detached pending intents so the world owner can supply a complete explicit settlement order without inferring successful intents from pending journals.

## Verification

- Relevant adapter/movement/physical/service-observation/inventory tests:36 tests across eight files passed in477ms. Fixed smoke76 tests/15 files passed in517ms.
- The composed fixture uses real task admission, runner, route progress, shared traffic, action arbiter, physical inventories and transfer journals. A32-energy opening courier traverses four steps, delivers at105, spends its completion frame before empty travel, collects at108 and delivers another50 at112. Completion readiness is106/113. Final stocks (body0/container50/bank82) conserve the starting132 energy. Only actual settled deliveries become request receipts. This is one courier with plain terrain and no competing outside actors or new births; it does not replace native calibration or all-actor home scheduling.
- Movement cases cover unrequested and stationary bodies, outside dependency chains, room exclusion, duplicate requests, fatigue, phase transitions, wrong physical continuation and action-owner invalidation.
- Type checking, lint, architecture boundaries, Lizard (1149 production/957 test files; zero violations) and packaged bundle passed. Full units remain reserved for milestone/ticket closure.
- Native regression `engine-v3HQ3P` passed the supported1000 scenario on clean published runtime source. Existing64 activated-route observations,50 productive movement calls, six home snapshots, actual task/journal/claim checks and exact settlement calendars remained enabled. This validates native compatibility of the shared follower and stage/progress extraction; the complete private forecast fixture was not installed as a native financial calendar.

Raw native regression evidence: `evidence/startup-paid-physical-composition.json` and its compressed archive.

## Next integration gates

Create the concrete home world composition from canonical native inventories, bodies and activated routes. Supply real recruitment/authority assumptions, source visibility, room/tile legality and all outside actors' movement/effect schedules. Integrate source mining/maintenance, births, cleanup/retirement/alternate sinks, and the single home sink/spawn/cash timeline. Add bounded private-world checkpoint/resume and source-attributed receipt baselines before financial use. Future native calendar comparison, multiple sources, full horizon and strict5ms qualification remain open. No financial admission or live deployment was enabled.
