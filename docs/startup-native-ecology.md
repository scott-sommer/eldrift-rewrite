# Native home ecology capture

ED-29 runtime source: `0432979de03de908c888390508555d8781a0c065`. The coherent before-dispatch home observation now carries the `EnergyEcology` input used by the shared physical source model. Capture is read-only and never initializes source, route, claim or financial owner state.

## Coverage and boundaries

Capture includes the home room, selected source rooms and rooms occupied by the observed home workers, deduplicated and bounded to16 visible rooms. It reads all natural sources and their actual SDK energy/capacity/regeneration countdown, actual `ENERGY_REGEN_TIME`/`ENERGY_DECAY`, live standing containers and energy resource piles. Non-energy piles are excluded from the energy model. Natural source stock and dropped resources remain separate from withdrawable inventories and bank cash.

All live container stores in these rooms join the canonical physical inventory, including containers outside the selected source plans. Mixed cargo uses actual SDK capacity/used/free values. Their stock and capacity pools join claim partitioning, so existing outside liabilities remain selected. Contradictory repeated container facts, missing vision, guard refusal, source power effects and room/source/store/drop bounds defer capture rather than silently truncate or use an unqualified source clock. Power effects require a separate physical model; their presence produces `home-observation-ecology` deferral.

`createPaidHomePhysicalInventory` now consumes ecology from a native packet by default. The native probe checks equality of the captured ecology and private physical seed. Native world construction can therefore use these facts without recreating or monetizing source stock. This does not yet install a private miner or household controller.

## Evidence

- Targeted observation/inventory/source-work/checkpoint selection:24 tests/five files passed in6.85s. This was the measured run, including its cold tooling overhead.
- Fixed smoke:76 tests/15 files passed in609ms; selection unchanged.
- `npm run quality` passed: type checking, lint, boundaries and pinned Lizard (1168 production/963 test files, zero violations). `npm run check:bundle` passed.
- `node tools/engine/smoke.cjs --remote-pipeline-configured --external-pipeline-telemetry` passed the supported1000 scenario (`engine-v3Vzm7`) on clean published source above. The telemetry flag uses local fixture memory/files, not an external service. Existing exact settlement-calendar, activated-route and task/journal/claim assertions remained enabled.
- At150..155, all six home snapshots are ready and seed ecology exactly. Three sources are captured: remote stock1100/1092/1084/1076/1068/1060, actual capacity1500 and regeneration countdown243..238; two home sources each hold1000/capacity3000 and countdown152..147. The one live container is present in the43 structure inventories; actual body inventories remain separate. Natural source IDs are absent from withdrawable inventories.
- Native ground observations in these six snapshots are empty. Nonempty SDK resource filtering, outside-container inclusion, mixed cargo, detachment, claim preservation, conflicting stock, excessive piles, source effects/vision and guard refusal have focused fixture evidence. Do not describe those nonempty branches as packaged native qualification.

Exact source, archive hashes and raw evidence: `evidence/startup-native-ecology.json` and its deterministic compressed archive. Full units and closure CI remain reserved for major milestones/ticket closure and were not run here.

## Next required work

The paid miner observation still contains a task header rather than the full task record. Capture full task/assignment/station ownership before building a private controller that preserves wake/retry/payload and lease renewal semantics. Reuse the actual task runner and miner selector for approach, establishment, repair, handoff and harvest; do not harvest every tick or infer authority from an expired opening token. Add maintenance/container lifecycle, pickup/drop actions, capacity/power transitions, household controllers and prospective body lifecycle. Extend checkpoints to those owners and reconcile the one material inventory with cash/spawn accounting. Exact multi-source future native calendars, full horizon, strict5ms and the remaining RC gates stay open. No financial admission or deployment was enabled.
