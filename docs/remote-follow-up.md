# Pending ED-29 integration audit (read-only findings)

This audit separates completed components from remaining integration. Latest clean39722c0 passes all223 engine checks in 1487.75 seconds; see evidence/remote-pipeline-native.json and evidence/remote-pipeline-engine-suite.json. Earlier construction evidence remains archived separately. Earlier timing evidence remains archived separately. The remaining obligations below are still required.

## Actual replacement interval

Implemented in the current timing component: the shared remote service timing calculator now supplies both economic body/spawn cost intervals and published fleet travel/retirement/margin profiles. Miner retirement uses a separately measured full-CARRY return leg; courier retirement retains its conservative whole-trip reserve. Productive service and replacement intervals remain separate, including scheduling overlap and the native inclusive spawn admission tick. Focused tests cover the arithmetic and recruitment boundary. Natural-lifetime native evidence remains the calibration gate; this does not account for startup capital or idle-worker operating losses.

## Reservation audit against pinned local engine

Primary source: tools/engine/node_modules/@screeps/engine/src/processor/intents/creeps/reserveController.js, controllers/tick.js, sources/tick.js (engine 4.3.2).

Reserve effect is active CLAIM count times CONTROLLER_RESERVE. A new reservation starts at gameTime + 1, then adds effect. Controller aging clears at gameTime >= endTime - 1. A single CLAIM therefore cannot accumulate a useful handoff buffer; use a genuinely buffered feasible body and qualify missed-tick/replacement behavior. Do not infer this from price alone.

Source capacity changes between SOURCE_ENERGY_NEUTRAL_CAPACITY and SOURCE_ENERGY_CAPACITY as reservation/ownership changes. Capacity increase does not instantly refill stock: regeneration remains a separate timer. Preserve observed source facts separately from projected reservation-enabled production. Existing current-admission compares actual source capacity, so overwriting sourceFacts.capacity with a hypothetical capacity would invalidate authority or misrepresent observation.

Existing portfolio commitment fields already support one whole-room energy/spawn/slot overhead. A per-room reserver quote could use those fields while each source quote retains explicit observed/projected facts; avoid charging the same reserver both in a commitment and per-source reservation shares. Buffered quote output now supplies this room-level commitment contract, with unit proof of one charge for two sources. Separately measured, bounded/resumable controller travel is implemented at 14cf721; see remote-reservation-quotes.md. Validated per-room selection and quote persistence are implemented at6bcfa0e, with schema3 management migration and live controller requotation; configurable ordinary candidate generation follows at8300dca with bounded persistent stable sweeps; automatic population still needs integration. The buffer remains a model until native handoff/missed-tick qualification.

## Startup funding

A valid reservation body can consume all initial spawn energy before extraction exists. Reservation selection/recruitment must coexist with source bootstrap and native home energy redistribution; do not inject resources mid-run to hide a startup deadlock. Local energy redistribution must not be counted again as remote income by the receipt fixture. Startup capital, miner build duty cycle, idle couriers and payback remain open.

## Loaded miner retirement travel

Implemented in the current timing component: assessment and resumable management now measure four legs, including full-CARRY miner return from the actual outbound arrival. Travel progress, management and fleet envelopes advance to schema 2. Validated schema-1 travel/cache records are invalidated for remeasurement; lease generations and scoped fleet identities are preserved, while stale fleet demand is disabled until qualified profiles are republished. Corrupt legacy records fail validation. Native upgrade qualification exercises active workers, receipts, reloads and unrelated state preservation.

The native assessment fixture includes a farther source whose loaded miner return estimate exceeds its unloaded outbound estimate. This qualifies engine path quotation, not actual long-distance loaded retirement. The existing natural-lifetime fleet fixture remains a short route. A focused clean 947ac1f controlled-retirement fixture now qualifies an initially-aged, fully loaded miner across a swamp interior: home at tick 184, 50 energy confirmed at 192 with 28 TTL remaining, natural expiry at 220; see evidence/remote-swamp-return-native.json. This does not qualify long-route recruitment/handoff overlap. Contention during handoff, damage after quotation and alternate-home recovery still require dedicated runtime evidence. Controller travel for reservers remains a separate obligation.

## Automatic construction status

Construction workforce now has ordinary main-loop recruitment, route/body-aware service timing, capital/worker controls, final dispatch revalidation and shared source/construction same-tick slot accounting. Native proof starts without a builder and separates birth stock, construction expenditure and home-funded refund. See remote-construction-recruitment.md. Automatic source selection/discovery is not part of that fixture, and whole-project startup capital/payback, replacement/pressure, stale-site cleanup and reservation remain open.

## Automatic reservation population status

a376519 adds funded recruitment, current final admission, shared controller actors, natural buffered replacement, threat retreat/recovery and scoped queue/spawn cancellation. Source-capacity repricing and live reservation duration refresh prevent self-revocation. See remote-reservation-population.md and evidence/reservation-population-native.json. Combined discovery/extraction/home redistribution income and payback, vision loss, adaptive policy and broader gates remain open.

## Combined ordinary pipeline status

39722c0 qualifies ordinary scout-to-discovery-to-priced selection-to-miner/courier/reserver/distributor operation for one configured outpost. Independently confirmed deliveries cover workforce births and final capital reconciles after loaded withdrawal. See remote-pipeline-qualification.md. Prebuilt infrastructure, multi-room startup stability, controlled vision loss and the broader obligations above remain open.

## Controlled reservation vision status

83c0112 qualifies native sensor departure, suppression of restart after the configured observation-expiry window, hostile re-observation and fresh-generation recovery using the same returned reserver. See reservation-vision-qualification.md and evidence/reservation-vision-native.json. This is a focused test-harness increment on unchanged production source; the223-case full baseline remains current. Adaptive capacity/reachability, long-route stale approach and broader gates remain open.

## Adaptive capacity and automatic reachability status

721c935 integrates default-off per-home adaptive source capacity, bounded occupied/starved observation and separate source/workforce budgets; nine clean focused cases are archived in evidence/adaptive-capacity-native.json. f058e77 adds mandatory automatic-fleet source-arrival/full-life observation and home-scoped exclusion;73e8fa9 adds explicit local/mineral target guards. Ten baseline and three final-source native cases pass; see remote-reachability.md and its two evidence manifests. The earlier open-status paragraphs describe their original commits.

Custom operator/specialist population metadata remains ED-39/ED-35 work. Whole-project startup solvency, construction warmup, idle couriers, infrastructure payback, multi-room stability, longer-route/alternate-home behavior and ED-43 pressure remain open. The next source-backed audit is remote-startup-economics-audit.md. None of these gates follows from steady-state profitability or the prebuilt-container pipeline.


## Staged startup qualification

Source `1bb16a7` qualifies opt-in staged birth readiness and protected complete-current-crew funding. Six focused clean native checks pass, including ordinary no-container startup for 5,000 ticks: container 1,305, first credit 1,322, recovery crossing 3,401, loaded withdrawal 4,000. Income 17,580 covers all births 11,050 and actual construction 5,000 with surplus 1,530; final home capital reconciles exactly with measured expiry loss zero. See [runtime evidence and limits](remote-startup-runtime.md) and [native manifest](evidence/remote-startup-runtime-native.json). Earlier pending statements refer to their original milestones. Whole-project candidate horizon selection, future achievable replacement schedules, dynamic multi-room/alternate-home behavior and broader cleanup remain open. Registry 233 has not been fully rerun; the historical full baseline remains 223.
