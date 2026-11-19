# Finite startup container maintenance

ED-29 remains In Progress. Startup delivery now requires explicit container durability and repair policy facts. It no longer assumes infrastructure survives an arbitrary payback horizon without energy or worker actions. Inputs bind to the first frame where construction is visible: current/max hits, decay amount, action-frame decay phase/interval and the existing mining repair policy (or explicit no-repair strategy).

## Action and energy ownership

The portable model reuses `shouldRepairMining` and `minerStep`: source-depleted time supports routine repair, while critical damage requires the configured energy reserve. Repair occupies that miner action and consumes its carried remote energy. Unboosted effects match WORK times100 repair hits, capped by available energy and remaining damage, at one energy per100 hits rounded up. A one-hit repair therefore costs one energy, not zero. Repair expense is withheld from source deliveries, not charged again to home cash.

Frame effects repair before container decay, matching the pinned room processor's action-before-object-tick ordering. Finite worker service, funding and travel still bound available labor. No body, energy or repair time is invented during a replacement gap. The detached maintenance owner records hits repaired, repair energy, decay events and destruction date without adding native effects, persistent state or a competing infrastructure owner.

If decay destroys the container, new source work/collection stops. Remaining stored energy is recorded as `unrecoveredEnergy`, an uncredited cumulative disposition rather than assumed salvage or surviving ground-drop stock. Loaded couriers can still deliver home. Miner/courier cargo, already delivered income, repair consumption, harvest overflow and lost container stock remain separate in conservation. The model does not automatically rebuild or resurrect failed infrastructure; an alternative construction/recovery strategy remains required.

## Pinned processor qualification

`npm run test:processors` runs actual engine4.3.2 repair/container processor functions against controlled fixture objects, clock, bulk and constants ports. It does not start a private server or database. Four comparisons verify repair rounding, neutral/owned decay timing and native dropped resources on destruction. The native constant100 uses a `gameTime >= nextDecayTime - 1` trigger and reschedules from the action frame, producing99 frames between neutral decay actions in this pinned processor; owned constant500 produces499. The model accepts measured action-frame intervals explicitly rather than silently using the numeric constants as elapsed-action counts. These observations qualify this local pinned processor, not every live server version or a future native observation adapter.

Fresh construction uses full native container hits and a first deadline from the construction processor. Existing infrastructure needs actual observed durability/phase. The caller must translate those facts to the model's construction-visible reference frame and revalidate ownership/controller/phase changes. Constant decay regime, unboosted WORK, safe uninterrupted access and one underfoot container are the current supported strategy. Attacks, ownership changes, alternate builders, salvage/rebuild and interrupted service remain outside this qualification.

The isolated source/constant lockfile and SHA-256 bindings are recorded in [processor evidence](evidence/remote-container-maintenance-processors.json). [Processor tool instructions](../tools/processors/README.md) explain setup, controlled-port scope and the retained upstream dependency audit findings. The [Quality run44635379758](https://github.com/scott-sommer/eldrift-rewrite/actions/runs/44635379758) passes on Ubuntu24.04 and Windows2022 for source7cb0751, including root unit/quality checks, isolated processor installation/comparisons and packaging. The job IDs, dates and required successful steps are archived in the processor evidence manifest.

## Checks and remaining integration

Nine maintenance behaviors cover critical repair/action cost, reserve-preserving production, depleted-source repair, unmaintained stock loss, loaded return after failure, repair before same-frame decay, absent labor, invalid phases/frame order, no resurrection and detached input facts. Ordinary units1,632/420 files11.35s; controlled processor comparisons4/1 file228ms. Typecheck, lint, boundaries, CommonJS packaging and Lizard pass (767 production/622 test files, zero violations). The earlier focused six-file run passed35 tests310ms before processor checks were isolated from ordinary units.

The gameplay bundle remains byte-identical to clean native source08afcf2: `2f84cee435e77f1801a46ca86357bf85e228064838661104cd5ee1e836c59cd1`. No new full-server scenario or registry case was run; the current233-case suite still lacks a new full rerun. Existing clean native evidence retains its source/artifact scope.

Native fact/route binding, operational courier timing, earned-income feedback to later births, configurable whole-project candidate admission and wider multi-room/pressure/parity requirements remain open. Ordinary candidate selection still does not call this portable project model.
