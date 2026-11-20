# Persistent lab assignments and shared hauling

ED-36 now connects configured direct-product production to ordinary hauling. The bot clears incompatible input/output minerals, refills reagent inputs from owned storage or terminals and banks output products. Assignments survive reset and stay stable as stocks change. Automatic chain selection, boost reservations/observed mission gating and remaining operator controls are still required; ED-36 remains In Progress.

## Responsibility and provenance

The reference is role.mineralCourierV2.js evaluateInputLabs245 and evaluateReactionLabs269 at baseline f2bbf7e8c44addc7c426abb5458e393c9502ff5f, alongside labV2 setupLabs103. Legacy input policy clears incorrect minerals then fills below200; output policy clears incorrect minerals or drains above500. The rewrite preserves clearing, supply and product banking through the existing request/task/reservation/transfer-confirmation owners. It does not port that role's renewal, boost, nuker or power-spawn paths as part of this increment.

Pure assignment selection admits geometrically useful dirty labs, so incompatible stock can be cleared rather than permanently preventing a layout. Stored input/output identities remain fixed for a recipe and eligible roster. Reaction execution separately requires observed correct input minerals and compatible output minerals. Source/capacity claims remain in the shared ledger and protect physical quantities independently of assignment persistence.

The pure transport planner selects one service direction per lab. An incompatible input drains before refill; outputs drain any present mineral. Refill quantity is bounded by target headroom plus the input reserve, warehouse reagent stock after its supply floor, lab capacity and the configured trip batch. Current policy banks every positive output batch, rather than preserving the legacy500-unit drain threshold. The native warehouse order is storage then terminal; each respects its existing configured free-space floor and shared capacity/stock claims. This deliberately changes the legacy terminal-first policy, while the planner accepts an ordered warehouse port for alternative policies.

One service owner per room/lab reconciles ordinary logistics requests. Existing admitted jobs finish before their direction reverses. A recipe, excluded-lab or roster change cancels only unclaimed service requests and waits while admitted work remains. Assignment replacement never clears courier tasks or fabricates a delivery. Disabling reactions uses the same cancellation fence: admitted cargo may finish, but no new reaction is issued. Disabling only lab transport cancels unclaimed service work while allowing reaction from already available stock.

Room invisibility does not invoke the owned-room producer and does not erase assignments, intel or other state. A missing or excluded lab forces re-evaluation; its old service uses normal logistics target-loss recovery. Unseen-room transport and full mission/boost qualification remain separate acceptance work.

## Persistence and configuration

industry-labs/<room> is schema1, owner industry. Its assignment records product, reagent identities, two distinct input IDs, up to eight disjoint output IDs and a maximum-ten-lab eligible roster. Shape/ownership/future versions are validated. JSON reset preserves role identity; new eligible labs or removal/exclusion trigger a controlled reassignment. The existing logistics queue, task, quantity and intent-admission schemas are unchanged.

Alongside the five [reaction settings](industry-lab-reactions.md), configuration adds:

| Key | Default | Purpose |
| --- | --- | --- |
| labTransportEnabled | true | Generate refill/drain services when a configured reaction assignment exists |
| labTransportBatch | 200 | Maximum quantity per generated trip, from1 through3000 |
| labSupplyReserve | 0 | Retain this much of each warehouse reagent before offering refill stock |
| labTransportPriority | 8 | Ordinary shared-hauling request priority |

labReagentReserve still protects stock in each reaction input; labSupplyReserve protects warehouse stock. Existing storageFreeReserve and terminalFreeReserve protect bank capacity. New services require ordinary logistics to be enabled and an available courier; they share its configured recruitment and recovery behavior. No parallel mineral-role executor is introduced.

For rollback to the previous reaction-only revision, disable lab production, let admitted services settle or use ordinary cargo recovery, and remove the four new transport keys from every affected configuration layer before running the old validator. Retain task/request/journal/receipt ownership and reservations. The old code ignores the new industry namespace; do not relabel a persisted assignment or clear actual task state to simulate compatibility. Re-enable/rebuild assignments only under their current owner. Full upgrade/downgrade rehearsal remains ED-44 work.

## Observed qualification

Final source87e38d7 (main implementation d0679b7 plus warehouse-floor safeguard) passes1,821 unit cases/451files14.42s. Final focused+smoke18/5files.542s covers refill/drain, pinned assignment reset, active reconfiguration, disable cancellation, schema refusal, configuration and warehouse floors. Type checking, lint, boundaries and Lizard1.22.2 pass843production/675testfiles with zero violations. Processor comparisons4/.198s and suite-report1/.1213481s pass; bundle verification passes. The local processor run preceded the warehouse-only safeguard; its processor inputs are unchanged, and final hosted checks run against the final source.

Eleven clean native scenarios pass45.793s: lab supply, manual product switch, cancellation, depleted reagent supply, direct reactions, invalid geometry, lab destruction, mineral transport, structure actions, final-alive-tick delivery and packaged smoke. Each supply variant runs320ticks with resets31 and181. The full245-case registry was not rerun.

The supply fixture starts three dirty labs with10X each, a real warehouse and one ordinary courier. All subsequent collection, movement, transfers, production and confirmations run through the normal bot/engine. The final observations are:

| Scenario | Warehouse OH | Warehouse UH | Warehouse X | Courier cargo | Assignment |
| --- | ---: | ---: | ---: | ---: | --- |
| Normal | 15 | 0 | 30 | 0 | OH |
| Product switched at140 | 15 | 15 | 30 | 0 | UH |
| Reactions disabled at8 | 0 | 0 | 20 | 0 | none |
| No H supply | 0 | 0 | 30 | 0 | OH |

The final cancellation run still has an admitted job after disable: at10 the courier carries10 while the old assignment is retained; at12 cargo is empty, its receipt has settled and the assignment is released. This boundary is inspected directly in the archived native observations. Exact routes and loads depend on generated lab IDs; an earlier successful revision carried20 at its cancellation boundary. Tests assert the safety outcomes rather than assuming identical route timing across fixtures.

All variants require actual ordinary-hauling receipt evidence, empty final courier tasks and no live claims. Output product is fully banked, target quantities are not exceeded and depleted H cannot fabricate OH. The row receipts field sums currently retained logistics receipts; pruning can lower it, so it is not a lifetime manufacturing counter.

The [manifest](evidence/lab-transport.json) records source hashes, raw evidence hashes, measurement and domain-observation archives, exact final snapshots and the cancellation boundary. Dirty preflight results are excluded from these eleven qualified cases. Archive integrity is separate from scenario success and includes historical failed runs elsewhere.

Remaining ED-36 work: ordered priority targets and bounded reaction-chain dependency scheduling; boost resource/energy reservations, cancellation/expiry, shared movement/body admission and next-tick body confirmation before mission release; legacy lab/boost console operations; broader visibility/destruction/migration and release qualification. Product switching here is explicitly configured, not an automatic reaction-chain planner.

Hosted [CI44752108536](https://github.com/scott-sommer/eldrift-rewrite/actions/runs/44752108536) passes Windows2022 and Ubuntu24.04 on87e38d7. All six required checks pass in both jobs, including final-source processor and bundle checks.

The subsequent [automatic local chain planner](industry-lab-production.md) now qualifies bounded priority/dependency selection and real multistage production. Earlier references above to automatic chains as future work describe the prior increment; empire allocation and boost/operator obligations remain open.

The subsequent [explicit boost orchestration](industry-boosts.md) now qualifies counted requests, actor/body/lab reservations, shared supply, observed readiness and cancellation/reset/coexistence. Earlier boost references describe the prior increment; legacy aliases, producers/operators, empire allocation and release obligations remain open.
