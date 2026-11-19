# Reservation observation expiry and fresh recovery

Implementation83c0112 adds a550-tick real-engine qualification of the existing reservation lifecycle. Production source is unchanged from the clean39722c0 full223-case baseline. The increment shares fixture configuration and adds optional probe metadata; it does not change gameplay policy.

## Tested boundary

A supplied MOVE-only sensor grants initial remote vision and walks home through native movement after operator slot controls withdraw the reserver. No own creep is removed or teleported. At260, slot admission is restored while the sensor stays home and the target observation is older than the configured20-tick freshness window. The ordinary reservation population must not restart from those expired facts.

The sensor returns at330. A hostile introduced while the room was genuinely unseen must block recovery once observed. After the hostile is cleared at400, fresh safe facts may publish a newer generation and let the same healthy idle home-returned reserver resume service. Final withdrawal at470 must leave no owned reservation work.

This qualifies restart suppression after configured expiry and recovery on fresh observations. Operator controls initiate withdrawal. Still-fresh retained facts continue to follow normal known-safe traversal policy; the scenario does not impose a blanket immediate-stop rule whenever visibility disappears. Candidate management is driven by the fixture, while recruitment, funding, final admission and actor service use the ordinary main loop. The combined autonomous discovery pipeline is qualified separately in remote-pipeline-qualification.md.

## Native observations

The room becomes unseen at210. The retained source/controller observation remains timestamped201, including the formerly self-reserved controller with174 ticks remaining at that observation. Throughout the expired/unseen stage, the source IDs and original reservation snapshot remain intact: absence of vision does not become an invented empty room or a younger observation. The reserver remains home, idle and task-free; there is no lease, pending reserver birth or controller action.

The hostile is first freshly observed at336. Visible hostile frames have foreign-unit facts and permit no reservation service or pending birth. Fresh safe recovery produces a successful reserve action at404 under generation399, matching the current lease and newer than original generation1. The same worker name is retained and no second reserver is born.

Only a150-energy distributor and1300-energy reserver are recruited. Every row reconciles home stock, carried energy and accepted birth expenditure to10300 initial capital (2300 spawn/extensions plus8000 storage). No source energy is extracted or credited as income; no mid-run energy or lifetime change occurs. By550, home stock8850 plus births1450 accounts for that capital, and the original reserver is home/task-free with71 TTL. Scoped pending work and claims are0; unrelated state survives. Five reloads cover initial service, stale facts, hostile observation, fresh recovery and final withdrawal.

## Verification

All1461 unit tests /397 files pass in10.34 seconds. Type/lint/boundaries/bundle pass; pinned Lizard713 production /583 test files, zero violations. Clean focused native --reservation-vision, --reservation-population, --reservation-population-admission, --reservation-population-cancel and --remote-pipeline pass at83c0112. Exact550-tick rows and all five provenance/digests are in evidence/reservation-vision-native.json.

The registry now has224 cases. This test-harness-only increment did not rerun the full registry; production source is byte-identical to the latest223-case full qualification. That baseline remains evidence/remote-pipeline-engine-suite.json. CPU/memory samples include probe overhead and do not qualify ED-43 performance.

Long-route stale approach, adaptive capacity/full-life reachability, infrastructure/startup payback, dynamic multi-room capital stability, alternate-home ownership and pressure/soak remain open ED-29 obligations. This component does not complete the release-candidate goal.
