# Full-horizon refusal diagnosis

Fixture source1ca5111 adds `--yield-probe`, retaining the full1000-tick scenario while recording only denied transport stages and actor yield/deferred events. The600-row limit remains; the early200–240 courier window is bypassed. No production guard/actor code changed. Use external history collection to avoid unbounded fixture rows in bot Memory.

Targeted6tests/two files pass633ms, including capture at tick900, exclusion of successful phases and the cap. Collector4checks pass207.6ms; fixed smoke76/15 pass543ms; quality (1042 production/898 test files, zero violations) and CommonJS bundle pass. No full units or milestone CI ran.

[Two raw archives and the60-row refusal trace](evidence/startup-refusal-trace.json) preserve both FAILED exact-calendar outcomes. The instrumented run observed35, matched births/activations, firstharvest166/income183 andrepair88, but had3256/3264harvest,3074/3080delivery and39/53receipt frames. First differing receipt is263/56 against262/62. The untraced run matched3264harvest but delivered2396/3080 in41/53frames. Neither qualifies the5ms gate.

The trace contains28 yields,7 deferred actors,17 transport-execute denials,2 source denials and6 whole-run denials. The first refusal is miner4 yielding at242; its source energy964 and cargo32 remain unchanged in the next row, while courier5 loads56. This is same-run evidence of missed miner service preceding the first altered receipt. Later courier refusals are also explicit, including execute denial279.

Large costs occur immediately after actual scheduled VM reloads: the miner yields at311 with total tick CPU66.22ms; courier6 yields at861 around54.90ms. These are distinct from smaller steady-state refusals. The diagnostic callback can affect timing; the untraced failure is independently retained. No trace-based result replaces untraced qualification or old fixture-pressure failures.

## Next cold-path separation

Source inspection, rather than isolated timing attribution, identifies a concrete reset cost. createEconomicApprovalViews.service caches static paid geometry, but a cold cache calls current(profile), whose matchingEconomicApproval reader validates the complete approval namespace. validStartupApproval restores the planning project, and coherent financial assessment restores/computes completed evidence again. Paid actors need the validated quote geometry; their live lease/risk/task/quantity/retirement checks remain elsewhere. They do not need to re-establish spending authority for already paid bodies.

Add an explicitly read-only geometry projection under the approval namespace's existing owner. Validate current envelope version/owner, bounded home/revision/clock/entry identity, job generation/context and complete quote geometry/corridor; return only a detached plan. Do not interpret that projection as a financial approval, publish pending work or grant admission. Financial current/capture/admit/result must retain full current validation, even if geometry is available. Keep the native paid-geometry cache body/home/source/generation matching and bounded; do not introduce another persistent namespace.

Test cold/recreated readers, JSON reset, detached mutation, wrong home/source/generation/body, invalid geometry/owner/future format, and a deliberately corrupt financial checkpoint that remains rejected by financial reads. An invalid financial checkpoint must never become payable merely because static geometry can be recovered for a paid actor. Measure reset frames separately and then rerun full untraced qualification. This is a source-supported candidate for cold cost, not proof that it explains all66ms or the earlier steady-state refusal.

ED-29 remains open. Future schedules, shared capital, replacement/home loss and all downstream specialist/operator/parity/pressure/migration/RC gates remain required.
