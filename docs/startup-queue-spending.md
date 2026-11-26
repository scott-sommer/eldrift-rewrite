# Fresh queue spending at economic boundaries

The configured economic proposal already imports competing queued births into its finite spawn and cash timeline. However, current execution binding covered configuration/static topology and prior births, without detecting requests added after observation. Two behavioral regressions against the old code reproduced approval and final-payment acceptance despite a newly queued home worker omitted from the forecast.

Source84c675b adds startupQueueMatches, a read-only projection through the existing population queue owner/schema. Current unexpired requests eligible within the frozen horizon must match a priced request exactly after observation-relative clock normalization. Owner/home/body/priority/placement/boost/admission/expiry and ready time remain part of equality. Expired and beyond-horizon requests are ignored. No queue or financial namespace is initialized by the read.

The check runs before advancing a proposal, again immediately before publication, during producer-side cohort maintenance and independently at final birth admission. A changed queue discards unpaid planning and removes only exact unstarted participants. Other owners, changed records and occupied paid names are preserved. This is a fresh spending fence, not a new capital ledger or automatic household schedule.

## Coordinator integration

Native runs revealed two integration details that the initial tests omitted. The spawn coordinator persists readyAt=tick+1 before preparation to prevent duplicate uncertain effects. A successful birth can then remain in the queue until next-tick reconciliation. Treating either as new spending incorrectly refused or revoked companions.

Source89245f7 permits only the exact attempted request with that one ready-time seal; all other terms must still match. Sourcef3b6c0a also recognizes a paid entry with a matching observed request/body/owner/home and seal at observed start+1. It normalizes only that readiness change. Existing independent completed-forecast prior-birth checks still require exact actual start and activation clocks; observed payment never grants permission to ignore another queue request or mutate other terms. Clock and identity checks are extracted to keep complexity within the pinned limits. No format changes or new persistent ownership.

## Evidence

[Eight source-qualified native archives](evidence/startup-queue-spending.json) retain six failures and two passes. Initial accepted/changed campaigns failed from attempt seals; the next accepted/changed campaigns exposed paid-entry reconciliation. Both180-tick refused runs also failed their fresh-replanning condition: actual source visibility was only25..48, without a return before180. The prior geometry-era refusal archive14d5626 had a second observation164. Current changed-policy evidence returns later and qualifies its own observation201. Do not claim the old180-tick refusal gate passes, attribute its changed vision timing solely to this fence, or stretch that campaign silently.

On final production sourcef3b6c0a:

| Campaign | Result | Exact comparison |
| --- | --- | --- |
| Supported1000 engine-UGa3td | PASSED |61receipt frames/amounts,3752harvest/3528delivery/88repair; first mining93/income110; birth, withdrawal, cleanup and capital checks |
| Changed-policy1000 engine-nWGWON | PASSED |50receipt frames/amounts,3000harvest/2912delivery/88repair; observation201, first mining262/income279; invalidation and fresh approval |

The changed queue-spending cases are targeted portable regressions, not a native multi-source capital qualification. Native campaigns verify integration with the real coordinator and unchanged accepted/changed-policy behavior. The final source was not rerun through the180-tick refusal case or strict5ms campaign; neither has passing qualification to claim.

## Incremental verification and remaining scope

Targeted economic/projection/staging/cleanup contracts38tests/five files passed903ms; final extracted paid-seal/admission/cleanup set19tests/three files passed768ms. Fixed smoke76/15 passed483ms during the correction and536ms on final source. Typecheck, lint, architecture, pinned Lizard1046production/903test files with zero violations, and CommonJS bundle checks pass. Full units, full registry and milestone CI were not run.

Next qualify actual future household/refill/work schedules and shared multi-source home capital, preserving this queue fence and quantity/financial owners. Also resolve the180-tick refusal/revisit operating case and strict5ms exact calendar. Longer-route natural replacement, home-loss recovery and downstream parity/pressure/migration/RC obligations remain open. This correction does not close ED-29.
