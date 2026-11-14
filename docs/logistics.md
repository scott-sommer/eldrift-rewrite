# Logistics implementation (ED-21)

Status: in progress. The feature must preserve couriers, distributors, haulers, scavengers, mineral logistics, source storage fallback, and link roles. ED-20 completion does not waive the downstream obligations in mining-acceptance.md.

The first mechanism computes carrying capacity as the sum of each route's production times its own round-trip duration, divided by expected utilization. Separate outbound, loaded-return, service and delay times allow terrain, load and congestion to influence demand without importing pathfinding into population arithmetic. Results expose per-route contributions, capacity shortfall and whole-worker demand.

Callers must supply effective production rates and measured/estimated travel times, exclude retiring workers according to the shared replacement horizon, and count pending requests once. Routes are additive obligations; the formula does not claim optimal multi-stop tours, delivery evidence or actual colony throughput. Replacement travel is a population lifecycle input, not a surcharge on every hauling trip.

Next: explicit stock/free-capacity reservations and request lifecycle, then persistent hauling tasks and native observations through the shared action/movement/spawn boundary. Required failure scenarios remain empty source, full sink, partial transfer, death, storage loss, reset and contention. Legacy reference files remain read-only; arithmetic is a new mechanism, not a claim that role.hauler's state machine has been ported.

Validation: npm run quality passed (122 production files, zero Lizard violations); all 289 unit tests passed in 2.89s. Four new demand tests cover asymmetric sources, load/travel/service/delay inputs, utilization, committed capacity and invalid/overflow inputs. No engine rerun for this pure, not-yet-wired mechanism.
