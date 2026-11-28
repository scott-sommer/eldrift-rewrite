# Physical repair effects and native health/profile capture

ED-29 runtime source: `c3d2f1e34ced16c57d3c73ef8d2c7effcc05810b`. Repair is now an actual ordered effect in the shared physical energy world, with structure health distinct from store stock. The private miner repair branch can use `mining-state/repair.ts` to admit and queue that effect through its existing shared work arbiter.

## One material owner

The energy frame dispatches withdraw/transfer, harvest and repair through separate small operation owners. Actor observations remain frozen; explicitly ordered repair consumes actual processor-time energy, updates total store usage/free space and repairs actual remaining damage. Competing repairs may heal the target first, leaving later attempts with zero cost/effect. A preceding donation can increase the later repair's available energy; no opening-energy cap is invented. Invalid order/range/shape cannot partially commit energy or health.

The existing unboosted `energyRepairEffect` supplies base hits and rounded energy cost. Its boosted companion preserves pinned engine4.3.2 behavior: charge the base effect first, sort all WORK boost bonuses (including already damaged parts), slice by the base repaired-hit amount, then floor/clamp bonus hits. Applying a generic harvest-rate multiplier here would charge the wrong energy. Nonrepairable structures remain zero effects, matching processor construction-cost gating.

Native body capture now supplies active WORK count and the full repair-bonus list from actual SDK parts/boosts. Native ecology captures bounded structure ID/position/hits/hitsMax/repairability. Source-station health is cross-checked with the existing native station observation. Body-pose and range admission use current physical facts. Repair effects are excluded from hauling transfer confirmation and produce no paid-courier income.

## Checkpoint ownership

Checkpoints retain mutable current health and repair effects while validating immutable health-target identity, position, hitsMax and repairability against the original packet. Structure-only and explicitly supplied empty ecology are retained rather than dropped when sources/ground are absent. Legacy inputs without optional health facts remain accepted; they cannot issue repairs to unknown targets. Restore checks repair cost/hit accounting and its next-frame clock. Source work resumes without reverting current health or energy to the opening.

## Evidence

- `npx vitest run --config tools/processors/vitest.config.mjs tools/processors/repair.check.mjs tools/processors/hauling.check.mjs tools/processors/harvest.check.mjs`:25 comparisons/three files passed in336ms. Repair cases cover rounding, active/inactive boosted WORK, energy shortage, mixed cargo, fully repaired and nonrepairable targets, and both donation/repair orders. Store stock, health and actual native event hits/energySpent match. These are processor fixtures, not a complete native tick/calendar.
- Relevant repair/inventory/mining/home-observation/checkpoint/transfer unit selection:40 tests/seven files passed in6.37s (measured cold tooling overhead included). Cases include frozen observations, racing repairs, atomic refusal, corrupt effects/range, native profile capture and JSON resume.
- In the private mining integration, critical repair consumes1 energy and adds100 hits instead of harvesting. Starting from1 hit/48 energy, current health and energy continue through JSON resume; after five repairs health is501. No courier receipt is emitted. Construction still uses a controlled effect port in this fixture and is not physically qualified.
- Fixed smoke76 tests/15 files passed in604ms, selection unchanged. `npm run quality` passed (type checking, lint, boundaries, pinned Lizard1179 production/968 test files, zero violations). `npm run check:bundle` passed. Full units/closure CI were not run for this incremental step.
- `node tools/engine/smoke.cjs --remote-pipeline-configured --external-pipeline-telemetry`: supported1000 `engine-P6ZpI7` passed on clean published runtime source above, with existing exact receipt-calendar, activated-route, source/inventory/task/control assertions retained. Telemetry is local fixture memory/files only.
- Six native snapshots150..155 each capture44 health records. The selected miner has4 active WORK and four zero bonus entries. The actual station is245000/250000 hits and repairable, equal to its source observation. This native run qualifies health/profile capture and regression; boosted repair effects and private material repairs have the separate focused evidence above.

Exact source, raw archive and hashes: `evidence/startup-physical-repair.json` and its deterministic compressed archive.

## Remaining integration

Construction effects/completion and container decay/destruction still require material ownership, processing-order facts and checkpoint transitions. The current health roster and maximums remain fixed; source power/capacity, target power effects, body damage/TTL and future births need their modeled transitions. Current environment/infrastructure/movement/banking providers and household/outside work must be wired before installing a complete private forecast. Reconcile one material world with cash/spawn accounting, then prove exact multi-source future native receipt calendars, full horizon and strict5ms operation. ED-29 and later RC gates remain open. No financial admission or deployment enabled.
