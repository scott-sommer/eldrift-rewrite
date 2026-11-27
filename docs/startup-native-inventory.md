# Canonical native opening inventories

Final runtime source: `90a425ce84e8feea52e97720bf1dedb05f5ab321` (ED-29). Initial body-conversion source: `b92a04bd916cad29fb15cb1521de818548220eaf`.

## Snapshot and conversion

The coherent home observation now records a native ID and actual SDK store for every home-associated or physically present owned creep. Energy capacity, total used capacity and free energy capacity come from the SDK; they are not derived from a paid body template. Other actors and mixed cargo remain physical liabilities. Spawning bodies are recorded as inactive. Existing worker facts retain position, owner, body and lifetime observations.

Each physical inventory carries its SDK-derived capacity-pool identity. General stores/creeps share a capacity pool; energy compartments on limited stores retain their separate energy pool. Stock and capacity pools for observed structures and bodies enter the existing whole-claim partition. The bounded partition supports512 selected pools, consistent with two pools for each of256 bounded physical inventories. A128-body fixture exercises258 pools and retains an outside claim on the last body; this is a claim-selection check, not native128-body performance evidence.

A quoted home container is explicitly included even though it is absent from owned structures. Its stock pool remains selected. The existing spendable home stock calculation is unchanged: merely observing container energy or worker cargo does not make it immediately available for spawning.

`hauling-state/inventory.ts` converts the snapshot into the canonical shared energy inventory. It rejects contradictory worker/native identity, stale paid observations, mismatched paid capacity/cargo/owner/position, bank stock/capacity disagreement, invalid capacity-pool identity and duplicate physical stores. It preserves the original detached snapshot and performs no live writes.

## Evidence

- Relevant inventory/observation/claim/transfer tests:14 tests across five files passed in380ms.
- Fixed smoke76 tests/15 files passed in466ms. Type checking, lint, architecture boundaries, Lizard (1143 production/954 test files, zero violations) and packaged bundle passed. Full units remain reserved for milestone/ticket closure.
- `engine-LOiXmg`: supported1000 native scenario passed on clean published initial body source. Each tick150..155 converts43 structure stores plus6 body stores into49 unique inventories, with actual paid body capacities.
- `engine-W41rXC`: same supported1000 scenario passed on clean published final source. All six snapshots retain49 inventories,42 specialized energy capacity pools and98 selected stock/capacity pools. Actual task/journal/claim and activated route checks, and existing exact settlement calendar assertions, remained enabled.

The native scenario uses ordinary unboosted actors and its existing storage bank. Boosted/mixed SDK capacity handling and the quoted-container omission correction have focused fixture coverage; this native run does not establish a new boosted or container-bank scenario.

Compressed raw evidence and exact-source hashes: `evidence/startup-native-inventory.json` and its two archives. Earlier source evidence is retained separately rather than attributed to the final implementation.

## Remaining integration

This qualifies the physical opening state only. Next, compose canonical inventory/body identity with the shared movement frame and the actual hauling service/transfer adapter, then concrete trip recruitment, all-actor processing order, mining/maintenance and lifecycle/births. Integrate one home sink/spawn/cash timeline, retain source-attributed future receipts and exclude opening baselines, and add bounded checkpoint/resume. Future native calendar calibration, multiple sources, full horizon, alternate sinks/cleanup/retirement and strict5ms qualification remain open. No financial admission or live deployment was enabled.
