# Layout strategy port (ED-24, in progress)

Reference: Eldrift-Directive f2bbf7e8c44addc7c426abb5458e393c9502ff5f.

The standard strategy delegates core placement, template construction and all source/controller/mineral/utility logistics to room.layout.shared.js. Its bootstrap selector searches placement again; the rewrite must select bootstrap from the committed eventual plan instead.

The constrained strategy has a compact terminal/link core, ten lab offsets, road offsets and separate service/utility placement recipes. Its search bounds are 36 anchors and 12 successful plans. These are legacy search policy, not evidence of globally optimal placement. Both strategies use room.layout.scoring.js.

## Service scoring characterization

service-score.ts ports scoreDistributorServicing as a pure typed function. Spawn weight is 8, extension weight 1; cost is Chebyshev distance times weight times 10, with up to three adjacent roads credited at weight times 4 each. Duplicate roads count once. Empty targets score negative infinity. The result exposes distance cost and road credit rather than hiding their contribution.

This legacy heuristic does not prove path connectivity, reachable service positions or hauling CPU. It must only contribute after hard candidate validation. Invalid coordinates now fail explicitly. Tests cover exact weighted arithmetic, diagonal distance, adjacency credit saturation, duplicate/order independence, empty targets and malformed positions.

## Remaining acceptance work

Port complete templates and constrained placement, incremental enumeration and checkpointing; validate legal sharing, stage counts, access, labs, paths and egress; add remaining score dimensions, deterministic selection/hysteresis, preserve-existing locks, provenance and staged bootstrap. Native planner integration and reset/CPU-budget scenarios remain unimplemented. No ED-24 acceptance criterion is complete yet.

## Standard footprint port

The full RAW_TEMPLATE is preserved as 128 storage-relative placements: 60 extensions, 43 roads, 10 labs, 6 towers, 3 spawns, and one each storage, terminal, link, power spawn, nuker and observer. The checked-in absolute-coordinate legacy fixture provides characterization independent of the relative representation. Tests reconstruct the original coordinates/order and verify all pairwise Chebyshev distances, unique occupancy and fixed storage anchor across all eight orientations. Generic template placement rejects the entire footprint when any tile violates room margins and returns independent positions.

Validation: npm run quality passed (328 production files, zero Lizard violations); npm test passed 616 tests in 188 files, 5.94 seconds. This proves footprint geometry only. RCL staging, placement eligibility, lab functionality, logistics attachments and strategy selection remain pending; no native integration is claimed.
