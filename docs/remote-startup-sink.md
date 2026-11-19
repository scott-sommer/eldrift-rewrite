# Finite startup delivery sinks

ED-29 remains In Progress. The portable delivery forecast now requires explicit `homeSink` facts instead of assuming unlimited accepting home storage. This describes one quoted reachable endpoint, not instant transfer across an aggregate of home structures. Native endpoint eligibility, ownership, stock claims and return-route binding still belong to the caller before operational selection can use the forecast.

## Capacity and receipt ownership

`startup/sink.ts` owns only ephemeral physical acceptance capacity. Inputs are capacity, initial free capacity and up to64 uniquely identified finite `occupy`/`release` schedules. Validated totals are bounded to one billion energy; timing/recurrence validation reuses the existing cash-flow contracts. The factory detaches facts/schedules, enforces monotonic action frames and rejects invalid transfers. It introduces no native effects, persistent namespace, competing stock journal or logistics claims.

For each action frame, declared competing occupancy consumes capacity before source-courier unloading. Source couriers share the remaining endpoint capacity in their existing deterministic order. Declared capacity releases settle after that frame's unload admission and enable the following frame. Changes before construction completion are replayed when delivery simulation begins. A release beyond physical maximum or an occupancy beyond available capacity is an infeasible supplied schedule, reported explicitly rather than inventing space.

These schedules describe physical endpoint changes, not money. A release may be an internal withdrawal; it neither grants income nor charges the home bank again. Actual expenses and external cash receipts must remain independently represented in the cash schedule where applicable. The result reports remaining capacity, accepted source energy and its projection-through frame. If construction never becomes ready, no delivery simulation starts and sink facts retain projection-through zero rather than claiming a horizon replay.

## Blocked and partial deliveries

Full sinks retain loaded courier cargo without a receipt. Partial unloads credit only accepted energy after the configured delivery/receipt delay; remaining cargo stays with that worker for a later attempt. Each subsequent partial transfer consumes its own delay. Capacity is committed on projected acceptance so two couriers cannot claim the same space. Transfers whose receipts are outside the cash horizon remain uncredited.

A blocked worker can reach its finite lifetime while loaded. `unreturnedCourierEnergy` records that modeled disposition, separately from active courier cargo, container stock, miner cargo and delivered income. It is not observed tombstone energy or proof of native asset loss/recovery. No future salvage is invented. Conservation includes this disposition, and the cash forecast includes only accepted observed-date receipts.

## Qualification and remaining work

Nine sink behaviors cover full/partial acceptance, delayed releases, competing occupancy before container readiness, shared courier capacity, sequential partial unloads, modeled loaded expiry, infeasible facts and port frame-order/transfer guards. The existing delivery fixture was extracted for shared use without changing its scenario. Full units1,623/419 files11.35s; focused sink/delivery/archived native mining calibration plus broad smoke22 tests/4 files358ms preceded the final sequential-partial case. Typecheck, lint, boundaries, packaged CommonJS and Lizard pass (765 production/621 test files, zero violations).

No new engine execution was required for this portable-only change: the rebuilt gameplay bundle SHA-256 `2f84cee435e77f1801a46ca86357bf85e228064838661104cd5ee1e836c59cd1` exactly matches the clean packaged-smoke artifact at source08afcf2, recorded in [overflow calibration/regression provenance](evidence/remote-harvest-overflow-calibration.json). This is artifact identity evidence for unchanged ordinary runtime, not native qualification of the new sink forecast. The233-case registry has not been fully rerun; the historical full baseline remains223.

Candidate selection does not yet call this portable forecast. Runtime stock/endpoint changes require native revalidation; alternate sinks need a travel/transfer strategy rather than aggregated free space. Container maintenance, earned-income feedback into future births, interrupted service, native courier timing calibration and full project horizon admission remain open.
