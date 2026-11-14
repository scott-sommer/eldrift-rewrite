# Upgrade-room service and remaining specialist parity

## Ported service policy
The pure upgrade-service planner selectively ports role.upgradeMaster.js into one desired shipment per observation. It first clears non-energy storage stock into terminal, then services the first active owned lab, then energy demand. Native selection uses deterministic structure IDs instead of incidental enumeration. Existing shared service reconciliation retains admitted cargo through direction changes; local couriers execute using standard quantity reservations, lab mineral compartment capacity, native transfer journal and movement.

Boost preference is XGH2O, GH2O, GH. As in the legacy, lab mineral maintenance starts below the configured target, terminal candidate stock must be strictly greater than that target, and topping an existing mineral requires strictly more terminal stock than the missing quantity. An inferior/unsupported or insufficiently supported partial lab is drained before switching. A full lab is not replaced until it falls below the target. Energy service prioritizes spawn at/below its floor, then lab, then storage. Below RCL6 storage can supply the spawn when terminal energy is unavailable.

Deliberate corrections: missing/disabled endpoints do not throw; observed headroom bounds each shipment; mineral fill stops at its target and storage fill at its ceiling instead of overshooting with a whole carry load. Physical ownership/activity is checked at observation. General store balancing is suppressed while this service owns the room's terminal/storage policy to avoid opposing transfers. Recovery stops new service admission (including energy requests) and reconciles unreserved service work; already-carried cargo can settle. Future general lab/boost orchestration must explicitly coordinate lab ownership with this service.

## Configuration and execution
upgradeRoomServiceEnabled defaults false and requires logisticsEnabled to execute. It generates requests for the existing courier fleet; enable courierSpawningEnabled for automatic local courier demand. It does not yet create or position a dedicated upgrade master.

Defaults: upgradeLabMineralTarget1300, upgradeSpawnEnergyFloor100, upgradeStorageEnergyCeiling990000, upgradeServiceBatch200. They use the normal layered room configuration. New requests pause during energy recovery. Service configuration is independent of normal worker modes and does not claim that specialist renewal/boosting is implemented.

## Evidence
Pure policy tests cover storage cleanup precedence, stronger boost replacement, strict stock boundaries, incompatible mineral clearing, terminal capacity, energy order, storage ceiling and pre-RCL6 fallback. Admission tests cover opt-in/disable/recovery and preserve ordinary/support/recovery-banking scope gates.

Packaged --upgrade-service runs the actual main loop for150ticks with a50capacity courier, storage20H, lab40GH, terminal1500XGH2O+100energy. Final storageH0, lab1300XGH2O+100energy, terminal20H+40GH+200XGH2O, courier empty, tasks/claims empty. The fixture records confirmed receipt IDs across request expiration and proves totals H20, GH40, XGH2O1300 and energy100, rather than relying only on final cargo disappearance. Stronger evidence engine-pPvy8G passed; initial engine-YXpZJ5 checked final stock and retained final-energy receipts only. The strengthened fixture supersedes that narrower evidence. Final thresholds/native active-stock refinements are also covered by the full regression recorded below.

Quality237production/225testfiles passes with zero Lizard violations. Full479tests/147files passes3.86s; packaged bundle check passes.

## Remaining UpgradeRoom/master requirements
upgradeRoom.js implements a seven-position storage ring, TTL sorting/reassignment, staggered renewal triggers, rotation after renewal, boost requests and empire-energy shutdown. Those need feature-owned persisted state, stable creep identity, geometry validation, shared spawn/lab action ownership and native scenarios. Remove the hardcoded Mordox identity comparison in favor of actual ownership.

The legacy RCL8 unclaim/reclaim cycle is a real capability, not a placeholder. It requires an explicit configurable lifecycle and simulated validation, including claimer access and memory continuity. No live unclaim, deployment or destructive in-game migration is authorized by this implementation.

role.upgradeMaster.js additionally positions a dedicated master adjacent to lab/storage/terminal/spawn, travels from its home to assigned room, handles low-RCL retirement/hauler interaction, and renews below500TTL. These remain open; shared courier servicing is not evidence that the stationary master lifecycle is complete. Specialist population/body demand, upgrader renewal/boost execution and assigned-room work remain ED-22/ED-31 integration work.

Full102native checks passed155.98s before the final full-spawn threshold refinement. Review then found that configuring spawnFloor equal to capacity could let a full spawn mask lab demand. The planner now requires actual spawn headroom; unit coverage checks that boundary. Final full479tests/147files passed4.46s, bundle and quality passed. The strengthened native service case sets spawnFloor300 and ordinary storeBalancingEnabled=true: service still owns all requests, the full spawn does not block lab energy, and every inventory/receipt assertion passes (engine-7qSPoU). Thus the final narrow guard has targeted native coverage; a second full102case rerun is not claimed. No live deployment, renewal, boosting or unclaim operation was performed.
