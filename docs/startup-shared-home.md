# Home cohort coordination and multi-source counterexample

Production source48bbcd8 prevents one home from staging a second cohort while financial birth requests remain unpaid. This follows the fresh queue-spending fence: publishing a second independently priced cohort would otherwise introduce spending absent from the first forecast and invalidate its unpaid companions. A targeted regression reproduced canStartHomeJob returning true with another source's approved unpaid queue; it now returns false.

startupQueueHasUnpaidCohort reads the existing home queue/schema without initializing it, ignores ordinary/expired requests and accepts only fresh observed paid request identities with matching owner/home/body and a start at or after the admission observation. The native application supplies observeStartupBirths, which validates real body/placement/spawn clocks. Another home has an independent queue. No financial permission, new ledger, state namespace or format is introduced. This coordinates initial cohorts; it does not replace final admission or jointly optimize a multi-source portfolio.

Targeted contracts cover one/partial/all paid observations, changed owner, home isolation, ordinary requests and expiry. Existing exact attempted/paid queue-seal behavior remains separate. The complete accepted and repeated-refusal native scenarios still pass on this source.

## Real two-source campaign

New --remote-pipeline-configured-shared uses the ordinary configured pipeline with two real1500-energy sources and adjacent containers in E0N1, one home bank and spawn queue, a300-tick financial horizon, actual scouting, resident/household births and ordinary logistics. It seeds no lease, selected fleet, proposal or approval. Approval summaries are passive and bounded16. The1000-tick verifier requires two source approvals without churn, second observation after the first cohort payments, already-spent bank observation, exact actual birth identities/costs/start/activation clocks, source-specific settled income, final capital conservation and scoped withdrawal/cleanup. It does not substitute aggregate receipts for exact per-source forecast qualification, which remains a later requirement.

The first clean native run engine-4xpyfJ FAILED the two-approval assertion: only one source was approved. Both sources were discovered, quoted positive and selected in the real lease. First cohort observation33/approval42 produced550+200+200 births at63/84/96 and activations84/96/108. It stayed stable and ultimately returned3690 confirmed income with12637 final capital. No second-source cohort was funded, so none of those first-source results qualify multi-source admission.

The current projection intentionally observes the whole room workforce. workerContext in projection/incumbents.ts rejects workers belonging to a different source as unmodeled existing-workforce liabilities. After the first crew is active, the second source cannot obtain a supported projection. This is a known model boundary, not a reason to filter out the first crew or mark this campaign passing. A new targeted contract requires other-source paid workers to remain explicit liabilities until supported shared modeling exists.

## Evidence and checks

[Three verified native archives](evidence/startup-shared-home.json) retain the counterexample and two regressions on48bbcd8:

| Campaign | Result | Scope |
| --- | --- | --- |
| Two-source1000 engine-4xpyfJ | FAILED |Only one approved source; shared-capital gate remains open |
| Accepted1000 engine-LZHaxQ | PASSED |Existing exact single-source767-horizon forecast and capital/cleanup assertions |
| Refused180 engine-ETHk2Y | PASSED |Explicit real scout revisit and repeated financial rejection |

Initial coordinator/staging16tests/two files passed803ms; final coordinator/staging/projection32tests/three files passed2.59s. Fixed smoke76/15 passed466ms initially and882ms finally. Typecheck, lint, architecture, pinned Lizard1046production/905test files with zero violations, bundle loading and native harness syntax pass. Full units/full registry/milestone CI were not run.

## Required next integration

Represent already-paid source cohorts and their remaining lives explicitly while preserving one home cash/spawn/capacity owner. Exclude already-paid birth costs from new capital requirements, retain future replacement/construction/reservation/household costs, avoid crediting another source's income twice and reserve shared endpoint capacity honestly. Current config/lease/financial/worker evidence must remain fresh at publication/payment; unknown or unsupported cohorts remain explicit refusals. Preserve the failed two-source campaign and its two-source assertions until it actually passes.

Then extend executable household/refill/work schedules and qualify insufficient/shared capital, later queue changes and multiple rooms. The strict5ms exact service gate, longer-route replacement, home-loss recovery and downstream feature/parity/pressure/migration/RC work remain required. ED-29 is not complete.
