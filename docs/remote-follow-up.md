# Pending ED-29 integration audit (read-only findings)

This note is not implementation or qualification. The clean ed82a98 full suite has now passed; these source-audited follow-ups are still required.

## Actual replacement interval

remoteFleetDemand now starts replacement at spawn + outbound + retireTicks + marginTicks. operatingBody still prices lifetime - outbound - replacementMargin. Thus service retirement and the added scheduling overlap are not fully represented in ongoing body/spawn costs. Centralize timing between native fleet publication/recruitment and economic pricing before claiming exact net yield. A natural run's observed births are the stronger calibration evidence; native spawn-duration endpoint conventions may differ by a tick from a conservative quote. Keep productive service, replacement interval, and scheduling lead distinct.

## Reservation audit against pinned local engine

Primary source: tools/engine/node_modules/@screeps/engine/src/processor/intents/creeps/reserveController.js, controllers/tick.js, sources/tick.js (engine 4.3.2).

Reserve effect is active CLAIM count times CONTROLLER_RESERVE. A new reservation starts at gameTime + 1, then adds effect. Controller aging clears at gameTime >= endTime - 1. A single CLAIM therefore cannot accumulate a useful handoff buffer; use a genuinely buffered feasible body and qualify missed-tick/replacement behavior. Do not infer this from price alone.

Source capacity changes between SOURCE_ENERGY_NEUTRAL_CAPACITY and SOURCE_ENERGY_CAPACITY as reservation/ownership changes. Capacity increase does not instantly refill stock: regeneration remains a separate timer. Preserve observed source facts separately from projected reservation-enabled production. Existing current-admission compares actual source capacity, so overwriting sourceFacts.capacity with a hypothetical capacity would invalidate authority or misrepresent observation.

Existing portfolio commitment fields already support one whole-room energy/spawn/slot overhead. A per-room reserver quote could use those fields while each source quote retains explicit observed/projected facts; avoid charging the same reserver both in a commitment and per-source reservation shares. This is an option to assess, not an adopted API decision. Controller travel must be measured separately from source travel with bounded/resumable work.

## Startup funding

A valid reservation body can consume all initial spawn energy before extraction exists. Reservation selection/recruitment must coexist with source bootstrap and native home energy redistribution; do not inject resources mid-run to hide a startup deadlock. Local energy redistribution must not be counted again as remote income by the receipt fixture. Startup capital, miner build duty cycle, idle couriers and payback remain open.

## Loaded miner retirement travel

RemoteTravel currently records miner outbound, courier outbound and loaded courier return only. Both assessment/travel.ts and management/travel.ts measure miner load 0. Fleet publication sets miner retireTicks to miner outbound + configured margin. A loaded miner can be slower on the return path (and may use a different terrain/routing path); do not generalize the short native lifetime return proof into all-distance cargo-safe retirement. Measure/bound loaded miner return explicitly and centralize timing/pricing. Update bounded travel-progress schema (currently at most three legs) and invalidate/migrate old partial quotes deliberately if another leg is introduced. Controller travel for reservers is separate again.
