# Native household travel quotes

ED-29 now quotes three separate household legs with the existing native mobility, path search and matrix-snapshot adapters: empty spawn-exit approach to the bank service tile, full-CARRY loaded travel to one energy structure's deposit tile, and empty return. Fixed service adjacency, exact arrival, ordered unboosted CARRY/MOVE body, operation bounds and admission guards are explicit. Incomplete legs never produce a usable quote. Inputs and callback data are detached; source/topology/body changes bind a different quote.

The native observer requires an owned home, active owned bank/spawn/energy destination and matching actual positions. It observes current quantity stock/capacity liabilities without creating reservations. Destination capacity belongs to that single spawn or extension. It is not the whole room's spawn-and-extension capacity. Matrix/topology freshness, walkable fixed tiles and actual PathFinder results are used on each call; no new persistent cache or namespace is created. A quote is static geometry plus an observation snapshot, not live action admission or an actual creep-trip timing calibration.

## Required capacity boundary

Measured legs alone cannot replace the existing declared aggregate household funding hypothesis. To connect this quote to native economic admission, model the receiving energy structures and actual spawn-energy consumption order, then bind each deposit to the accepting structure's capacity. A route to a300-energy spawn does not authorize a transfer into2300 of room-wide structures. Claim changes, current stock, body/birth readiness, topology and actual destination capacity still require final revalidation.

Primary-source inspection: pinned tools/engine/node_modules/@screeps/engine/src/processor/intents/spawns/_charge-energy.js uses distance-ordered active owned spawns before distance-ordered extensions when energyStructures is unspecified; explicit energyStructures uses the supplied filtered/unique order. Current src/adapters/screeps/spawn.ts does not pass energyStructures. This identifies the consumption policy to model; no per-structure forecast is implemented in this increment. The existing financial probe intentionally retains its declared trip hypothesis rather than silently treating this single-point quote as aggregate authority.

Native quoted trip generation, per-structure funding/consumption, household incumbents and full home schedules, actual native lifecycle/cashflow, default configuration/adoption, multi-room capital and pressure/rollback/RC remain open. The goal and ED-29 remain active.

## Incremental checks

13 targeted cases/3files0.279s (8 new portable/adapter behaviors plus existing startup travel regression), smoke76/15files1.02s, types/lint/boundaries/Lizard934production795testfiles0violations and CommonJS packaging pass. Input/body/geometry, exact loads/arrivals, incomplete/guard refusal, detached callbacks, topology changes, missing/foreign endpoints, stock/capacity claims and single-structure capacity are covered. The initial native quote closure exceeded CCN10; observation and measurement were extracted without an exception. Full units remain a milestone/ticket-closing gate.
