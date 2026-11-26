# Planning inspections and paid execution budget

ED-29 remains In Progress. The planning stall is resolved for the measured finite project, but full5ms economic execution still FAILS its exact delivery gate. The verified manifest evidence/startup-planning-inspection.json preserves9 raw runs (3 passes/6 failures, including2 deliberately short diagnostics) and5 traces. No failure is relabeled as a pass, and no calendar tolerance or CPU allowance was increased.

## Read once, keep the write fence

Source87a8bcf introduces createStartupPlanningJob.inspect. One operation captures a validated planning record privately and exposes a detached record copy plus continuation/result methods. Context passes that inspection to advance, avoiding redundant namespace decoding before simulation. Exposed-record mutation cannot alter the captured continuation. Save still reads current state and enforces expected revision and clock; an intervening writer cannot be overwritten. A completed old inspection remains historical evidence: withdrawal of the current scratch job makes fresh approval capture unavailable. Existing fresh read/advance/result APIs remain available.

The completion assessment can consume the already completed result without rereading scratch state. This is computation reuse, not approval authority. Approval capture still requires the current matching scratch evidence, and final native spending continues to require current binding, lease, body, placement, exact slot and observed prior births.

Sourcef3c4e09 additionally consumes once the exact simulation instance restored while validating the private detached job. The weakly held association introduces no persisted data. Canonical input/context matching precedes reuse; a second continuation/result from the same old inspection restores its original checkpoint rather than borrowing an advanced instance. A regression explicitly proves that advancing the model to completion cannot make the old captured checkpoint appear completed.

## Static service is separate from financial evidence

Sourcee66839c adds a bounded paid-service geometry view. Financial reads always invoke the current approval reader. A validated matching plan may be reused by already-paid actors without restoring the entire financial forecast every time they ask for service geometry. The cache is capped at2048 source keys, binds current generation/body/home/source and returns detached geometry. A new generation/source or incompatible body cannot borrow it.

Losing approval still refuses new financial authority, while a paid actor may retain its old static service geometry. Existing lease, ownership, risk, task and retirement checks continue to govern actual work and withdrawal. The cache is disposable on reset and grants no identity reservation, quantity claim or birth permission. Existing selection1/planning7/approval1/queue5/task2 formats are unchanged.

## Actor fairness and common hot paths

An opt-in260-tick --actor-probe records at most600 phase/CPU samples. Instrumented engine-15hTOz found typical begin-to-done medians around1.43ms for the miner and1.75/2.01ms for couriers, with individual spikes up to about4.09/5.08/3.98ms. These include SDK tracing and are fixture measurements, not platform-wide CPU constants. A late courier could be visited but hit its guard during validation, while the cursor still marked it serviced. Its next-tick position therefore remained last despite no useful step.

Source4071696 preserves cursor priority when a role actually observes budget deferral. A completed atomic step keeps its credit even if time expires after its last admission check. Two integration tests exercise the real actor cursor with deferred versus completed role steps. This corrects fairness; it does not manufacture processing capacity.

The same source shares role setup/observation contexts for identical owner+geometry within one home run. The scope is recreated on the next run, preserving current policy and budget guards; per-unit task and quantity identities remain separate. Existing acknowledged transfer journals are checked before decoding an irrelevant task when no settlement liability remains. Pending and unknown transfers still take the full validated settlement path. No action, payment or liability gate is skipped.

## Native results and limits

The inspection diagnostic at4e5c941 (engine-xWS12S,180 ticks) reaches768 frames and approval122 from observation35, before the first planned birth135. Actual births135/156/168 and activations156/168/180 match. It remains FAILED because a180-tick diagnostic cannot verify a forecast ending802. This is planning/birth evidence, not a full economic pass.

The untraced1000-tick run at4e5c941 (engine-7FLZhL) still misses its first candidate deadline and safely retries after visibility returns. It completes the observed165 candidate and admits it before its own starts, but fails the unchanged single-candidate gate. Sourcef3c4e09 then completes its first observed36 candidate, approving98 before start136, and all3 births match; engine-ZtTOe8 nevertheless FAILS because first harvest193 differs from167 and realized service falls far behind the model. Reading whole forecasts for static actor geometry was one identified source of that overhead.

After the service view, engine-ZzNW4q at e66839c restores exact first harvest167 and first receipt184, but later receipts drift (31 actual versus53 predicted). The actor diagnostic at2c00660 (15hTOz,260 ticks) intentionally ends before the forecast cutoff and remains FAILED; it records the fairness/CPU evidence above rather than a completed economic campaign.

The latest untraced5ms run4071696 (engine-Wa9UxZ,1000 ticks; frames20, lead100, horizon767) observes36, approves117 and pays its exact planned births136/157/169. Mining starts167 as predicted. Full execution still FAILS: first receipt185 versus184;35 actual receipt frames versus53 predicted;2128 delivered versus3080 predicted through803;3240 extracted versus3264; repair88 matches. The calendar trace records predicted and actual energy at each unioned receipt tick. Earlier/later income totals cannot excuse this mismatch. Do not mark default-budget viability achieved.

The same clean4071696 passes the supported --remote-pipeline-configured1000 (engine-bi9IHO): its explicit100ms fixture budget yields the exact61-receipt calendar through799,3528 delivered/3752 harvested/88 repair, loaded withdrawal804 and final10300+3690-1150-200-3=12637 physical home stock. Ordinary --remote-transport240 (NDNHiK) and configured refusal180 (XuFC7F) also pass. These do not substitute for the failed5ms operating case. Test withdrawal now starts only after the actual frozen forecast cutoff, rather than interrupting a later observation at the original fixed800 boundary.

Latest type/lint/boundaries/Lizard pass (1041 production/893 test files,0 violations), bundle/report integrity pass. Planning41 tests/6 files passed804ms; geometry/inspection/cohort/budget14/4 passed706ms; fairness/settlement/transport19/6 passed6.14s with cold transformation; the final fairness/settlement subset3/2 passed369ms. Smoke remains76/15, most recently487ms. Full units/full registry were not run and no ticket is closed.

## Next execution work

Keep the5ms exact-calendar case failed until actual service satisfies it. Planning no longer needs repeated full validation to advance; remaining work is the paid hauling path's budget cost and accurate service-capacity assumptions. Measure duplicate task/request/intel reads and reuse validated state only within an explicitly owned operation, preserving current head, lease, quantity and journal fences. Do not introduce a broad cache of spending authority or relax exact receipts to aggregate income. Continuous hauling already maps blocked resource outcomes to running; do not assume these delays are exponential retry backoff.

Where configured CPU capacity genuinely cannot sustain the forecast's every-tick service, admission/modeling must represent that constraint rather than approve an unachievable calendar. The full default1500-frame horizon, broader household/refill/reservation/construction/replacement schedules, shared multi-source capital, longer routes, alternate homes and aggregate pressure/soak remain unqualified. Continue the ED-29 acceptance audit and later ED backlog without treating these finite campaigns as full feature parity or a release candidate.
