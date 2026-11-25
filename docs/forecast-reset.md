# Offline startup forecast reset

This tool prepares a separate Memory JSON file for resetting derived startup forecasts for named homes. It has no connection to a shard and performs no live writes. Keep the original snapshot and its exact bytes outside mutable game memory. Resetting scratch forecasts does not reverse births, movements, receipts or world changes and is not a full release rollback.

For each selected home, the allowlist is `remoteStartupPlanning` (versions1–7), `remoteStartupSchedules` (1–4) and `remoteStartupCandidates` (1–5), owned by `remotes`. All three present records are removed together. Other homes, root legacy keys, creep memory and all operational namespaces remain structurally unchanged. Unknown owners, future/corrupt envelopes and unsupported roots block the operation. Absence is reported as an empty selection, not interpreted as compatibility.

Run from the primary checkout with an exported JSON Memory snapshot:

```powershell
node tools/memory/forecast-reset.mjs plan snapshot.json reset-plan.json W0N1
node tools/memory/forecast-reset.mjs apply snapshot.json reset-plan.json reset-output.json
```

Review the plan's homes, keys, owner/version values and source SHA256 before the second command. Both destination files must be new: the tool refuses overwrite. Apply recomputes the complete plan from the exact source bytes; source changes or plan edits refuse without writing output. The source is always retained. The source size limit is10MiB and a plan supports up to16 distinct homes. Output formatting changes whitespace, but retained JSON values do not change.

Before any deployment, qualify the target build against the prepared state and current world observations on a disposable server. Confirm fallback planning restarts safely, actual operational owners remain compatible, and operator controls persist. An old build can still reject unrelated future namespaces; this tool does not assert whole-build compatibility. Live upload/migration remains a separate user decision.

## Recorded local rehearsal

Tool source76046f9593d5a2cde051458680e50db356e329bf was run against the two isolated probe roots retained from native sourced55d41b5b0eef9f676492756c39894bad032d765. The passive root resets planning/schedule; the candidate root resets planning/cache and preserves its unrelated sentinel. Both retain their input bytes, preserve every unselected JSON value, refuse output overwrite, and refuse a changed source without creating output. [Evidence and archived source/plan/output bytes](evidence/forecast-reset.json) allow the transformation to be reproduced. Unit coverage additionally checks all three namespaces together, another home's forecast and operational queue/creep/legacy state preservation. This is an offline transformation rehearsal, not execution of an old build against current world state. Full old-build rollback remains open.

## Historical-owner upgrade and restart

The reproducible harness loads every imported owner/fixture dependency directly from committed Git objects, without checking out or editing the old source:

```powershell
node tools/memory/rehearse-forecast-upgrade.mjs ee26176 artifacts/new-forecast-upgrade-run
```

Use a new output directory; existing output files are never overwritten. It builds the same small orchestration wrapper against old/current committed modules, generates real old records, checks detached current reads, compares resumed outcomes to an old-code branch, proves old readers reject upgraded records, applies the scoped reset, and reruns old-owner planning/cache creation. This does not execute the complete old main loop or an evolving native world.

[Historical evidence](evidence/historical-forecast-upgrade.json) records successful execution from current33ed99db7c3e756345e22315f9bc6e8e6e07e357 against oldee26176e06076eabaebcddc30b7349078575b93c, with102/103 actual imported source files, bundle/entry hashes, genuine old planning5/schedule2/cache2 envelopes and archived old/upgraded/reset-plan/reset bytes. All checks pass, including old-owner restart matching initial derived state. Native upgrade with these records and full colony rollback remain open.

## Native reset with authentic records

Clean source16743c7126c891d3a1b82126466dcf7faed823de passes150-tick admission with the exact archived old snapshot as an isolated scratch root. It installs the fixture at game149, survives the module reload, then at150 reads the partial model checkpoint21 without changing persisted bytes and resumes through101. The entire resulting root equals the archived upgraded reference produced by the historical/current host rehearsal. Actual operational Memory.eldrift remains unchanged during these fixture-owner calls, and ordinary pipeline admission checks also pass. Model clocks are1/2, separate from native game149/150; these are real old model records, not native actor assignments.

[Native evidence](evidence/historical-native-reset.json) retains the source-qualified raw run, samples, pipeline observations and complete resumed proof. Original fixture bytes match the historical archive hashes. Targeted10/2 pass518ms, smoke76/15 pass471ms, quality/bundle pass and Lizard953 production822 tests zero violations. This closes the authentic-record native upgrade gap for these forecast owners only. Whole old-bot downgrade, world-state recovery and other migration requirements remain open.
