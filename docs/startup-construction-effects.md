# Construction effect foundation (ED-29)

The portable construction calculation preserves the pinned engine 4.3.2 processor's base energy charge before boosted progress. Active opening WORK supplies five base progress per part, clipped by processor-time energy and remaining progress. Boost bonuses include inactive boosted WORK, sort descending, and slice by base progress; final progress floors and clips to the remaining work. Repair shares the neutral WORK profile, validation and bonus ordering while retaining its separate energy calculation.

The SDK adapter captures opening body availability. Damage earlier in native processing is represented by the engine's `_oldHits` convention; forecast callers must retain the opening profile rather than recapture a damaged processor body. Construction permissions, target validity, range and object completion remain caller/physical-world responsibilities, not arithmetic assumptions.

## Evidence

- Eight new direct comparisons against the installed pinned build processor: ordinary work, energy shortage, final progress clipping, zero energy, inactive work and mixed/inactive boosts. Includes actual container completion, but asserts energy/progress only; structure birth is not qualified by these comparisons.
- Targeted construction/repair units: 8 tests across 3 files, 264 ms.
- Construction/repair pinned processor comparisons: 18 tests across 2 files, 286 ms.
- Fixed smoke suite: 76 tests across 15 files, 529 ms; selection unchanged.
- TypeScript, lint, dependency boundaries and pinned Lizard passed (1188 production files; zero violations). Full units were not run; this is an incremental checkpoint, not ticket closure.

## Remaining integration

Construction sites, explicit current build permission, processor-order energy settlement, declared structure birth recipes, newborn container postprocessing and checkpoint/restore validation still need integration into the energy inventory world and mining action ports. These helpers do not yet make build effects part of the future physical/calendar model. Native scenario and full milestone validation remain required before closing ED-29.
