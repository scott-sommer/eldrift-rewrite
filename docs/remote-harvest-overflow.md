# Native harvest overflow calibration

ED-29 remains In Progress. Comparing the new source-delivery model with the clean native startup trace exposed an incorrect effect assumption: a source harvest is not clipped to the creep's free CARRY. Engine4.3.2 removes the full available WORK output, increases cargo, then drops any excess. `_create-energy` fills a live container on the worker tile before creating a ground drop. This matters even without boosts: 4WORK harvests8 with only2 free CARRY, removing8 from the source, storing2 and depositing6 below the miner.

## Corrected boundary

`capabilities/mining/harvest-effect.ts` now models full source depletion, clipped stored cargo and explicit overflow. Construction projections report overflow as unrecovered energy rather than retaining it in the source or granting it to a successor. Post-construction delivery projections capture overflow only up to pre-frame free container space; the remainder is `uncapturedOverflowEnergy`. That field is cumulative energy excluded from collection/cash, not a claim about surviving ground-drop stock after decay. Full-container backpressure retains ordinary cargo; source/cargo/overflow conservation remains exact.

The capture model requires the miner to stand on the maintained container. It does not treat an adjacent container as an overflow recipient, recover ground drops, or assume same-frame courier withdrawal frees capacity for an earlier harvest. Input binding to a native station/container remains a caller obligation before runtime selection uses this model.

## Authoritative evidence

The pinned installed engine processors inspected are `@screeps/engine/src/processor/intents/creeps/harvest.js`, `creeps/drop.js` and `_create-energy.js`; SHA-256 provenance is recorded in the calibration manifest. Their source-harvest branch computes `min(source.energy, WORK output)` before resource overflow handling. This is an intentional correction based on current pinned engine behavior, not a claim about porting a legacy estimator.

`test/capabilities/remote-mining-native-calibration.test.mjs` binds the immutable 5,000-row staged startup archive to clean native source1bb16a769c2c06b2ebfed75c2f18cb3f8cadfc21 and its recorded SHA-256. The calibration window1305..1322 starts immediately after container completion. Each next-frame source stock and miner cargo matches, including source1244/CARRY50 at1312 after source1252/CARRY48 at1311. Two cycles yield120 extracted,12 overflow,112 observed courier collection and8 remaining miner cargo. Collection is replayed from native per-worker cargo changes; this does not qualify predicted courier travel/task timing. There is no source regeneration in this short window, and only this controlled station recipe/topology is calibrated here.

## Pricing and remaining scope

The existing `harvestCycleRate` and steady-state `remoteProduction` remain carried-only valuation assumptions. With power8/CARRY50 they budget50 per8-action cycle (6.25), while a container capturing overflow can receive56 per cycle (7). They must not be described as measurements of total native extraction. Their previous finite-CARRY tests used clipping effects; the test ports now use native-shaped harvest quantities while explicitly excluding overflow from their carried-only delivery counter. Scores are unchanged by this increment; infrastructure-aware valuation remains required before claiming exact delivered yield.

Full source/courier payback, maintenance/sink capacity, operating interruptions, earned-income feedback to later births and native candidate-selection integration remain open. Historical native income and lifetime tests retain their original observed outcomes; they do not prove every intermediate rate assumption. The new forecast correction adds no native scenario to the233-case registry.

## Checks

Full units1,614/418 files12.85s. Focused mining/calibration/delivery/self-build-native-data plus broad smoke26 tests/6 files318ms. Typecheck, lint, boundaries, CommonJS packaging and Lizard pass (764 production/619 test files, zero violations). Clean source08afcf2 funding-refusal (9.096s) and packaged smoke (0.928s) pass, runner10.027s, with clean reload provenance and zero reported game errors. [Calibration and regression provenance](evidence/remote-harvest-overflow-calibration.json) includes the engine source hashes, original trace binding and new150-row refusal trace. All66 trace archives verify. Station calibration uses the existing native run; this is not a new engine execution of the complete forecast.
