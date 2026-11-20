# Configured lab reactions

ED-36 has an ordinary-bot reaction path. This documents the foundational63964c7 increment. The subsequent [persistent assignment and hauling integration](industry-lab-transport.md) adds automatic refill/drain and controlled product changes. ED-36 and parent ED-7 remain In Progress: automatic chain selection, boost reservation/confirmation and legacy operator controls are still required.

## Porting and boundaries

Reference baseline f2bbf7e8c44addc7c426abb5458e393c9502ff5f: labV2.js runLabs at53 consumes two configured input labs from multiple outputs; controller.js invokes it at1151. labV2 setupLabs at103 assigns input/output/boost roles, while resourceManager.js selects priority targets and intermediate compounds. booster.js moves individual creeps to labs and removes boost requests immediately on API acceptance or error. That boost-success behavior must be corrected through next-tick body observation when ported. The current increment preserves the direct reaction capability, without claiming those unported policies.

The chemistry lookup consumes injected REACTIONS rather than copying the legacy compound table. A pure topology capability searches at most ten current eligible labs, checks Chebyshev range2 from each output to both distinct inputs, excludes incompatible minerals and chooses stocked inputs with deterministic ID tie breaks. Separate batch planning applies target headroom, reagent floors, output capacity, cooldown and per-output reaction amount. Native observations account for active operate-lab amounts; the engine scenarios here use ordinary unoperated outputs.

The application observes current owned/active labs and subtracts existing quantity claims. The industry feature then reserves both reagent-stock pools and the specialized output mineral-capacity pool through the existing quantity owner. These are the same pools used by hauling. Claims survive reconstruction and expire next tick; they are reservations, not production receipts. Durable structure admission prevents duplicate output actions and conflicts with boost use after reconstruction. No universal manager or new persistence schema is introduced. If a native call rejects or throws, same-frame reservations remain conservative until expiry.

Production is established by the next observation of actual stocks. The controller does not increment a manufactured-total counter on runReaction acceptance. Recomputing from current observations after reset or lab destruction preserves this distinction; losing visibility does not delete another feature's state. This is a room-local desired-stock controller, not an empire stock planner.

## Configuration

The existing layered configuration accepts these keys, including per-room overrides:

| Key | Default | Meaning |
| --- | --- | --- |
| labReactionsEnabled | false | Enable direct-product reactions for this room |
| labReactionProduct | empty string | Product resolved using current game REACTIONS; unknown nonempty product reports a room feature failure |
| labReactionTarget | 3000 | Stop admitting batches that would exceed this amount in current owned structures and owned creeps in the room |
| labReagentReserve | 0 | Additional floor retained in each selected input after other quantity claims |
| labReservedIds | empty array | Up to ten lab IDs excluded entirely, e.g. dedicated boost labs |

For example, enable OH with target15, reagent reserve5 and the dedicated boost lab's ID excluded. Supply H/O to a valid input pair. Production can run from that real stock; the original63964c7 increment did not publish supply/drain work; the [transport integration](industry-lab-transport.md) now does. A target smaller than a complete batch waits rather than overshooting. The later transport integration clears incompatible residual minerals during controlled product changes. Disabled production issues no new intents.

Rollback to a version predating these configuration keys requires removing the five lab keys from operator configuration layers after disabling production. Preserve shared task/request/journal/receipt state; existing quantity claims expire naturally. Existing structure admission and quantity schemas are unchanged. Full rollback rehearsal remains ED-44 work.

## Qualification

Source63964c7 passes1,809 units/448files12.61s, focused+smoke21/5files.247s, pinned Lizard1.22.2 with837production/667testfiles and zero violations, type checking, lint and dependency boundaries. Processor comparisons4/.204s, suite report1/.1311894s and bundle checks pass.

Seven clean native scenarios pass9.326s: lab reactions, incompatible geometry, lab destruction, shared structure actions, mineral transport, final-alive-tick hauling delivery and packaged smoke. All three lab scenarios reload the bot at tick6 and observe25ticks. Normal production creates10OH on the first effect tick, waits through cooldown/reset, reaches15OH and leaves5H/5O. The dedicated reserved lab makes zero product. Invalid geometry keeps20H/20O and makes zeroOH. Removing the H lab after initial production leaves10OH/10O and creates no further product. Intent-tick output remains zero; resource assertions use subsequent observations.

See the [evidence manifest](evidence/lab-reactions.json), including full production observations and source/raw hashes. The registry now contains241 scenarios; it was not fully rerun. These checks qualify configured direct reactions only, not complete lab/resource/boost parity. The earlier dirty-worktree native preflight is not counted among the clean seven.

## Remaining ED-36 work

1. Port explicit ordered production targets/reserves and dependency scheduling from resourceManager; derive every recipe from game constants. Account for unavailable/claimed reagents and bound recursive planning.
2. Persistent assignments, shared refill/drain, depleted supply and cancellation are now qualified in the [transport increment](industry-lab-transport.md). Automatic multi-stage chain scheduling remains required.
3. Add per-creep boost resource/energy reservations, shared movement and body-action admission, cancellation/expiry handling and next-tick body confirmation before mission release. Protect boost labs through feature-owned assignments rather than only manual exclusion.
4. Preserve setBoosts/setAllRoomBoosts/setupLabs and relevant operator entrypoints through application operations. Complete mineral courier/extraction and visibility-loss scenarios, then audit each ED-36 acceptance criterion before closing it.

API reference: [Screeps StructureLab.runReaction](https://docs.screeps.com/api/#StructureLab.runReaction). Geometry and chemistry are checked against the pinned4.3.2 processor as well as native scenarios; source inspection alone is not counted as execution proof.

Hosted [CI44746517189](https://github.com/scott-sommer/eldrift-rewrite/actions/runs/44746517189) passes Windows2022 and Ubuntu24.04 on63964c7, with all six required checks verified in both jobs.

The subsequent [automatic local chain planner](industry-lab-production.md) now qualifies bounded priority/dependency selection and real multistage production. Earlier references above to automatic chains as future work describe the prior increment; empire allocation and boost/operator obligations remain open.

The subsequent [explicit boost orchestration](industry-boosts.md) now qualifies counted requests, actor/body/lab reservations, shared supply, observed readiness and cancellation/reset/coexistence. Earlier boost references describe the prior increment; legacy aliases, producers/operators, empire allocation and release obligations remain open.


Subsequent increment: [operator lab policy and inspection](operator-labs.md) adds validated per-room configuration/clear operations, temporary lifetime controls and detached state/config provenance. It preserves admitted work and does not close general legacy console/flag compatibility.
