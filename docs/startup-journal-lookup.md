# Noninitializing transfer journal lookup

Source410dbd5 adds transferJournal.peek, using the existing validated detached read without initializing a missing journal. Fleet confirmations, task settlement and remote pending gates stop copying an existence probe before rereading the same journal. Acknowledged ordinary results return before loading task state. Pending and acknowledged unknown attempts still take the full settlement/recovery path; new intent begin remains independently current-state fenced.

Targeted26tests/7files passed (7.19s including initial transform); fixedsmoke76/15 passed474ms. Quality1041production/896testfiles, zero violations; CommonJS bundle passed. Full units and milestone CI were not run.

[Four clean-source native archives](evidence/startup-journal-lookup.json): unknown-delivery PASS, unknown-recovery PASS, supported configured1000 PASS, configured5ms1000 FAILED. The5ms forecast observed35 approved89; births/activations, firstharvest166/income183, repair88 and delivery3080 matched. Harvest3256 differs from3264, actual52 receipt frames differ from53 and first late receipt229 differs from228. The optimization does not close this gate.

Comparing the two full native campaigns at equal fleet ages (budget tick minus73 gives supported tick), source energy and crew snapshots agree until budget209/supported136. There source energy is1204 versus1196 and miner cargo16 versus24: one8-energy harvest has been missed. Budget actorAfter at208 is courier6 rather than miner4. This supports investigating admission-step cost and a deferred miner before analyzing later receipt timing; a timing trace from another run is not exact causation evidence for this run.

A concrete avoidable write is assignRemoteTask: each live miner renews its task using tick+ticksToLive, which normally remains the same absolute expiry, and often an unchanged authority token. It currently saves even when the resulting record is identical. A guarded no-change return can retain fresh assignment resolution and task validation while avoiding redundant writes. Test actual renewal, authority withdrawal/generation replacement, expiry changes and reset before native qualification. Other banking existence probes can use the same journal lookup, but do not accumulate speculative caches or treat micro-optimization alone as broader ED-29 completion.

ED-29 remains open; future schedules, shared capital, longer-route replacement and home-loss qualification remain required before milestone full tests and ticket closure.
