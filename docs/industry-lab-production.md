# Automatic local reaction chains

ED-36 now selects and executes missing intermediates for configured room production targets. The ordinary lab/hauling path makes OH and UH from raw minerals, then consumes them to produce UH2O without an operator changing recipes. This qualifies local chain selection; empire-wide allocation, boost orchestration, remaining specialist/operator paths and release gates remain open.

## Legacy reference and separation

At baseline f2bbf7e8c44addc7c426abb5458e393c9502ff5f, resourceManager.run95-120 selects the first deficient stock target; setupLabs155-196 expands a copied compound table, reverses intermediates and distributes manufacture across rooms. The rewrite replaces copied chemistry with injected game REACTIONS and makes priorities explicit. It does not yet port that module's empire-total aggregation, inter-room production allocation or global upgrade-boost target controls. Those remain required before full resourceManager parity.

The pure production planner performs backward dependency accounting against a speculative stock ledger. Shared raw reagents are deducted across branches, so OH and UH cannot both promise the same H. A candidate is accepted only if the whole bounded root window can be supplied. No real reservations or actions occur during this walk. When a high-priority target is infeasible, it can choose a feasible lower-priority target; equal priorities preserve configured order. The root window halves when raw supply cannot fund the full configured batch. This is a bounded progress policy, not a maximum-throughput optimizer.

Reagent floors are retained once in the virtual inventory, and intermediate manufacturing includes input-floor debt plus future warehouse-floor gaps. The reaction quantum comes from injected LAB_REACTION_AMOUNT, including intermediate rounding. Cycles, unknown targets, duplicate target products and invalid limits are refused before production effects. Walk depth is limited to16 and total visited nodes to1024 per selection; exhausted work reports a feature failure rather than issuing an incomplete plan. The public mechanism permits a validated smaller budget for tests.

A feature-owned absolute production step prevents each partial observation from moving the goal upward. It persists root, chosen product, exact reagent pair and observed-stock target. The step stays pinned until its measured product goal or root goal is met; configuration changes invalidate it, and current chemistry is checked before reuse. Progress is never inferred from runReaction acceptance. A depleted input can leave a selected step waiting for actual supply; no lower-priority preemption is promised during a pinned step.

Actual lab assignments, hauling and native action ownership remain in the earlier [transport integration](industry-lab-transport.md). A new product waits for admitted work before changing lab roles. When all goals are met or no feasible new step exists, the existing assignment can continue banking output with needed0, without more refills or reactions. Disabling reactions clears the production selection and follows the existing admitted-cargo cancellation fence.

## Stock scope

The native inventory includes active owned storage/terminals, eligible non-reserved active labs and actual cargo on admitted couriers owned by this room's lab services. It excludes boost-reserved labs and unrelated cargo. External stock claims reduce available supply. The lab service's own transfers are counted once through observed source/cargo/sink stock, so moving an intermediate does not cause another manufacturing demand. Warehouse floor gaps account for the reserve that an initially absent intermediate will need after banking.

These targets apply to this recoverable room production pool. They are not empire totals and do not include arbitrary creep, factory, container or reserved-boost stock that this producer cannot retrieve. Mineral extraction/stock delivery still uses the existing logistics path into the warehouses. Current tests cover absent supply; automatic recovery after a later outside stock arrival and broader visibility/pressure behavior remain further native qualification.

## Configuration and persistence

| Key | Default | Meaning |
| --- | --- | --- |
| labProductionTargets | empty array | Up to16 distinct {product,amount,priority} records; smaller priority runs first |
| labProductionBatch | 1000 | Root production window from5 through3000, rounded to the native reaction quantum |

A nonempty target list takes precedence over labReactionProduct/labReactionTarget. An empty list preserves the existing direct-product controller. Example: [{product:'UH2O',amount:10,priority:1}] with labReactionsEnabled true. Reaction/transport enable controls, reagent reserve, warehouse supply reserve, excluded lab IDs, trip batches and bank free-space floors continue to apply.

Target records are validated, copied with canonical property order and deeply frozen, so editing caller-owned objects cannot change effective policy or invalidate a step just through property-order changes. The array order still governs equal-priority ties. Amounts below one complete remaining reaction batch wait rather than exceeding the target. Intermediates can exceed their immediate consumption requirement to fund reserves and rounding. Operated outputs retain the existing exact-headroom execution guard; these native scenarios qualify unoperated lab reactions, not every operated-output quantum.

industry-production/<room> schema1, owner industry, stores a bounded policy context and nullable production step. It is separate from industry-labs/<room> schema1. Both current schemas reject unsupported future versions; no existing logistics/task/quantity/intent schema changes. JSON reset preserves the absolute step. Switching back to direct mode clears the production selection under its owner.

Rollback to code predating target planning requires disabling production, settling admitted work and removing the two new keys from affected configuration layers before older validation. Preserve the shared actual task/request/journal/receipt state and both industry namespaces; never relabel new state to force an older reader. Full upgrade/downgrade rehearsal remains ED-44 work.

## Pre-stocked reserve correction

The first planner revision b4f5d61 funded future warehouse floors only when it already needed to manufacture an intermediate. With15OH in a lab,20UH in bank and both floors5, it incorrectly selected the final UH2O step: banking the15OH could leave too little usable OH after both floors. A focused new test failed against that pre-fix production source; its failure log is archived explicitly as failed, with a dirty test worktree rather than clean native provenance.

The correction subtracts future-floor gaps from existing virtual availability as well as funding reserve debt in newly manufactured stock. It first adds5OH to reach a20OH pool goal, then selects UH2O/10. The new native pre-stocked case completes and retains both floors. Production context revision production/2 invalidates obsolete pinned selections without changing the schema shape; ordinary assignment/cargo fences still protect actual work. The final native set and hosted checks use corrected da20713, not the earlier implementation.

## Native qualification

Final source da20713 passes1,840 units/455files12.42s, focused+smoke20/5files.237s, type/lint/boundary checks and Lizard1.22.2 with851production/685testfiles and zero violations. Processor comparisons4/.201s, suite-report1/.1218684s and packaged bundle checks pass. Hosted [CI44763079842](https://github.com/scott-sommer/eldrift-rewrite/actions/runs/44763079842) passes Windows2022/Ubuntu24.04 with all six required checks.

Ten clean native cases pass110.670s: normal chain, pre-stocked intermediates, reserves, priority, depleted H, manual product switch, admitted-service cancellation, direct reactions, final-alive-tick delivery and packaged smoke. Five chain cases run640ticks, resetting31/121/241. Initial stock is seeded once; subsequent production, assignment changes, movement, transfers and confirmations use the ordinary bot. Dirty labs contain K, so clearing them cannot secretly supply the missing catalyst in the priority case.

| Chain case | First selected stages (tick:product/goal) | Final warehouse output |
| --- | --- | --- |
| Normal | 1:OH/10,39:UH/10,69:UH2O/10 | 10UH2O |
| Pre-stocked15OH in a lab and20UH in bank, both floors5 | 1:OH/20,17:UH2O/10 | 10UH2O plus5OH/5UH in warehouse |
| Both reserve floors5 | 1:OH/20,80:UH/20,130:UH2O/10 | 10UH2O plus5OH/5UH in warehouse |
| Infeasible catalyst target, thenZH priority | 1:ZH/5,22:OH/10,62:UH/10,92:UH2O/10 | 5ZH and10UH2O |
| No H | no step | no compound output |

Both reserve cases also retain5OH/5UH in lab inputs, so total remaining OH/UH are10 each. Normal H consumption is20, O10 and U10 for10UH2O; no shared H is duplicated. Product is banked, final courier cargo/tasks are empty and no live quantity claims remain. Target UH2O never exceeds10. The depleted case retains raw stock and dirty labs without manufacturing a compound. These are controlled case assertions, not a blanket guarantee against unrelated later stock arrivals.

See [manifest and traces](evidence/lab-chain.json) for exact source hashes, raw evidence hashes, measurement rows, domain observations, first stage decisions and final balances. Dirty preflights are excluded from the ten qualified cases. The registry contains250 cases and was not fully rerun. Measurement memory includes retained fixture rows and is not the ED-43 soak/production-memory gate.

Remaining ED-36 obligations include empire-wide stock/production allocation from resourceManager, boost mineral/energy reservations and cancellation, shared movement/body admission, next-tick body confirmation before mission release, relevant console operations and wider destruction/visibility/depletion-recovery/migration scenarios. Full parity and release remain unproven.

The subsequent [explicit boost orchestration](industry-boosts.md) now qualifies counted requests, actor/body/lab reservations, shared supply, observed readiness and cancellation/reset/coexistence. Earlier boost references describe the prior increment; legacy aliases, producers/operators, empire allocation and release obligations remain open.
