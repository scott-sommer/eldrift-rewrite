# Observer requests, actions and delayed capture

The observation owner separates requests, durable action admission, next-tick visibility capture and specialist mission policy. It is registered independently of optional existing-vision intel capture and defaults off. [Screeps documents](https://docs.screeps.com/api/#StructureObserver.observeRoom) delayed visibility and normal10-room range. Native action results determine actual availability/range, including engine-applied powers; the rewrite does not hardcode a10-room rejection for specialist requests.

## Source mapping

| Legacy responsibility | Rewrite boundary and scope |
| --- | --- |
| main.js131–133: monitor observations, power banks, then schedule next scans | app/native-observers settles prior vision before preparing/dispatching future requests. Mission state remains a separate owner. |
| utilV2.js1089–1107: rotate powerFarmingAssignments rooms | observation/refresh owns an ordered configurable room list; native-observer-demand rotates homes fairly. Power assignment translation remains ED-35/44. |
| utilV2.js1109–1125: find owned observer, call observeRoom, enqueue observation | observation/transitions persists a flight before the native effect; structure-actions.observe reserves the shared structure identity before calling the API. |
| utilV2.js1127 onward: wait for visibility and create power-bank mission facts | settleObservations consumes only due next-tick visibility, records plain intel and a receipt. Power-bank hits/power/decay and expedition ownership remain ED-35 responsibilities. |
| consoleCommands.js705 Game.observeRoom and portal scan direct calls | createObservationStore.submit supplies the narrow specialist/operator request port. Public console compatibility remains ED-39; legacy pending-memory translation remains ED-44. |
| defenseManager.js108–116 observer early warning | Empty source placeholder, not an implemented capability. |

The legacy empty-assignment return could abort every later home; its undefined stored index could becomeNaN. The new owner skips empty homes and persists a valid last-room cursor. Indefinitely retained unseen observations become bounded expired/missed receipts. A successful one-room interval1 scan can request consecutive ticks; the interval measures the prior issued tick rather than adding another delay after capture.

## Ownership and persistence

features/intel/observation contains the request/flight/receipt model, validation/schema, store, lifecycle transitions, cycle and assigned refresh policy. app/native-observers supplies native facts and the shared structure-action port; native-observer-admission applies per-home policy. The domain lifecycle does not access Game or select power-bank missions.

observations/empire is version1, ownerobservations. Limits are128queued requests,32flights,128retained receipts and128home cursors. Queue saturation returnsfalse; matching request IDs are idempotent while retained, conflicting payloads throw. IDs become reusable after bounded receipt eviction, so callers must choose a fresh operation ID for a new attempt. Revision checks guard owner updates; snapshots and native command inputs are detached. Future/corrupt state fails validation instead of clearing unrelated memory.

A request includes id, owner, home, room, priority, requestedAt and expiresAt. Queued requests move to a prepared flight before native invocation. The shared durable structure admission prevents competing calls, including after module reset, native rejection or exception. A reset between preparation and acknowledgement conservatively consumes that observer opportunity; it never retries a potentially issued same-tick effect.

Flights retain observer identity, issue tick and native acknowledgement. Only the following tick is eligible for capture. Missing vision, skipped capture admission, request expiry and native rejection have distinct timestamped receipts. A missed later tick does not fabricate an empty room or capture unrelated later vision as fulfilment. Successful capture calls the existing rich-intel store without a physical-visit flag; lastVisit is preserved. Failures describe observation delivery and do not imply hostile-room traversal risk. Error reporting is isolated per request.

Priority orders a fully scanned queue. A persisted request cursor permits progress past disabled requests when the queue exceeds its scan allowance. Requests are not repeatedly reissued by an unrelated feature; every specialist uses the same action owner. Receipt history is bounded evidence, not a permanent event log.

## Configuration

| Setting | Default and meaning |
| --- | --- |
| observersEnabled | false; per-home issue/refresh activation |
| observerAssignedRooms | []; ordered list, up to64canonical room names |
| observerRefreshInterval | 1; successful refresh interval from prior issue tick |
| observerRequestLifetime | 25; request TTL, minimum2 |
| observerFailureDelay | 25; retry delay after rejected/missed/expired assigned attempts |
| observerCpuBudget | 3; shared empire cooperative allowance |
| observerVisionBudget | 4; shared empire issue cap, maximum32 |
| observerCaptureBudget | 4; shared empire capture cap, maximum32 |
| observerScanBudget | 32; shared metadata scan allowance |

The four shared budgets accept environment/empire scope only. Room/profile/temporary overrides fail validation. The other policy settings follow normal configuration layers. New vision obeys empire and home backgroundEnabled, minimumBucket and backgroundCpuFraction. Already-issued next-tick capture is urgent and uses the observer allowance/tick limit even when optional background discovery is paused. Zero CPU/scans pauses the service; zero captures pauses capture and new issues. New issues are capped by both the configured issue and capture limits so the owner does not intentionally schedule more next-tick images than it can capture.

Settlement, refresh metadata and queue dispatch share scans and one CPU deadline. Refresh reserves dispatch scanning room; even a one-scan allowance progresses over multiple ticks. Guards are cooperative: an atomic snapshot/state write/native call can finish after admission's deadline. Disabled rooms retain standing specialist requests until housekeeping can expire them. Missing namespaces remain uninitialized while the feature is off.

Explicit observer lists may repeatedly refresh fresh facts for mission monitoring. They differ from scout exploration, where freshness suppresses automatic physical travel and depth constrains real room crossings. The observation API is not a walking route and can see hostile rooms without granting traversal permission.

## Executed evidence and remaining gates

Targeted --observer-runtime passes24real-engine ticks at default3CPU, global issue/capture caps1, two owned observers/homes and three remote targets. It proves actual next-tick visibility, assigned rotation, specialist priority, resets4/12, zero issue/CPU/capture controls, urgent capture while background is paused, native out-of-range rejection, unowned-home request expiry, missed-capture retry, rich intel, retained unseen facts, unchanged unrelated witness and no physical visits. No errors/messages are reported. The scenario configures refresh interval2 and retry delay2 to exercise those transitions within24ticks; default interval1 continuity is unit-tested. docs/evidence/observer-native.json retains exact dirty source/bundle provenance and an earlier failed development expectation.

Full units1231tests/344files pass9.66s; quality563production/489testfiles has zero Lizard violations; packaged CommonJS/no-Node-globals check passes. The prior clean6380e92 run passes187engine cases in694.37s and is archived separately. Current-source clean188-case qualification is pending.

This increment supplies the shared observer boundary. ED-35 still owns power-bank/keeper mission discovery and operation, ED-39 public controls, ED-44 legacy-memory translation/rollback, and ED-43 fleet/queue pressure, CPU/Memory and soak qualification. It is not a release-candidate or whole-goal completion claim.


### Clean combined qualification

All188packaged native engine checks pass in693.90s on cleand215833; every case's source provenance was checked for that commit and clean status. docs/evidence/observer-engine-suite.json archives the combined run; docs/evidence/observer-clean-native.json preserves the complete clean observer case. This qualifies the observer boundary described above. ED-28 remains open for the source-audited scout assigned-flag fallback before final acceptance; public console/memory adapters and later release gates remain separate obligations.
