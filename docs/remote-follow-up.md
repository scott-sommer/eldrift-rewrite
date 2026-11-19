# Pending ED-29 integration audit (read-only findings)

This audit separates completed components from remaining integration. Latest clean 672077c passes all 216 engine checks in 1,306.38 seconds; see evidence/remote-construction-native.json and evidence/remote-construction-engine-suite.json. Earlier timing evidence remains archived separately. The remaining obligations below are still required.

## Actual replacement interval

Implemented in the current timing component: the shared remote service timing calculator now supplies both economic body/spawn cost intervals and published fleet travel/retirement/margin profiles. Miner retirement uses a separately measured full-CARRY return leg; courier retirement retains its conservative whole-trip reserve. Productive service and replacement intervals remain separate, including scheduling overlap and the native inclusive spawn admission tick. Focused tests cover the arithmetic and recruitment boundary. Natural-lifetime native evidence remains the calibration gate; this does not account for startup capital or idle-worker operating losses.

## Reservation audit against pinned local engine

Primary source: tools/engine/node_modules/@screeps/engine/src/processor/intents/creeps/reserveController.js, controllers/tick.js, sources/tick.js (engine 4.3.2).

Reserve effect is active CLAIM count times CONTROLLER_RESERVE. A new reservation starts at gameTime + 1, then adds effect. Controller aging clears at gameTime >= endTime - 1. A single CLAIM therefore cannot accumulate a useful handoff buffer; use a genuinely buffered feasible body and qualify missed-tick/replacement behavior. Do not infer this from price alone.

Source capacity changes between SOURCE_ENERGY_NEUTRAL_CAPACITY and SOURCE_ENERGY_CAPACITY as reservation/ownership changes. Capacity increase does not instantly refill stock: regeneration remains a separate timer. Preserve observed source facts separately from projected reservation-enabled production. Existing current-admission compares actual source capacity, so overwriting sourceFacts.capacity with a hypothetical capacity would invalidate authority or misrepresent observation.

Existing portfolio commitment fields already support one whole-room energy/spawn/slot overhead. A per-room reserver quote could use those fields while each source quote retains explicit observed/projected facts; avoid charging the same reserver both in a commitment and per-source reservation shares. This is an option to assess, not an adopted API decision. Controller travel must be measured separately from source travel with bounded/resumable work.

## Startup funding

A valid reservation body can consume all initial spawn energy before extraction exists. Reservation selection/recruitment must coexist with source bootstrap and native home energy redistribution; do not inject resources mid-run to hide a startup deadlock. Local energy redistribution must not be counted again as remote income by the receipt fixture. Startup capital, miner build duty cycle, idle couriers and payback remain open.

## Loaded miner retirement travel

Implemented in the current timing component: assessment and resumable management now measure four legs, including full-CARRY miner return from the actual outbound arrival. Travel progress, management and fleet envelopes advance to schema 2. Validated schema-1 travel/cache records are invalidated for remeasurement; lease generations and scoped fleet identities are preserved, while stale fleet demand is disabled until qualified profiles are republished. Corrupt legacy records fail validation. Native upgrade qualification exercises active workers, receipts, reloads and unrelated state preservation.

The native assessment fixture includes a farther source whose loaded miner return estimate exceeds its unloaded outbound estimate. This qualifies engine path quotation, not actual long-distance loaded retirement. The existing natural-lifetime fleet fixture remains a short route. A focused clean 947ac1f controlled-retirement fixture now qualifies an initially-aged, fully loaded miner across a swamp interior: home at tick 184, 50 energy confirmed at 192 with 28 TTL remaining, natural expiry at 220; see evidence/remote-swamp-return-native.json. This does not qualify long-route recruitment/handoff overlap. Contention during handoff, damage after quotation and alternate-home recovery still require dedicated runtime evidence. Controller travel for reservers remains a separate obligation.

## Automatic construction status

Construction workforce now has ordinary main-loop recruitment, route/body-aware service timing, capital/worker controls, final dispatch revalidation and shared source/construction same-tick slot accounting. Native proof starts without a builder and separates birth stock, construction expenditure and home-funded refund. See remote-construction-recruitment.md. Automatic source selection/discovery is not part of that fixture, and whole-project startup capital/payback, replacement/pressure, stale-site cleanup and reservation remain open.
