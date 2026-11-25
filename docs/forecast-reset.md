# Offline startup forecast reset

This tool prepares a separate Memory JSON file for resetting derived startup forecasts for named homes. It has no connection to a shard and performs no live writes. Keep the original snapshot and its exact bytes outside mutable game memory. Resetting scratch forecasts does not reverse births, movements, receipts or world changes and is not a full release rollback.

For each selected home, the allowlist is `remoteStartupPlanning` (versions1–6), `remoteStartupSchedules` (1–3) and `remoteStartupCandidates` (1–3), owned by `remotes`. All three present records are removed together. Other homes, root legacy keys, creep memory and all operational namespaces remain structurally unchanged. Unknown owners, future/corrupt envelopes and unsupported roots block the operation. Absence is reported as an empty selection, not interpreted as compatibility.

Run from the primary checkout with an exported JSON Memory snapshot:

```powershell
node tools/memory/forecast-reset.mjs plan snapshot.json reset-plan.json W0N1
node tools/memory/forecast-reset.mjs apply snapshot.json reset-plan.json reset-output.json
```

Review the plan's homes, keys, owner/version values and source SHA256 before the second command. Both destination files must be new: the tool refuses overwrite. Apply recomputes the complete plan from the exact source bytes; source changes or plan edits refuse without writing output. The source is always retained. The source size limit is10MiB and a plan supports up to16 distinct homes. Output formatting changes whitespace, but retained JSON values do not change.

Before any deployment, qualify the target build against the prepared state and current world observations on a disposable server. Confirm fallback planning restarts safely, actual operational owners remain compatible, and operator controls persist. An old build can still reject unrelated future namespaces; this tool does not assert whole-build compatibility. Live upload/migration remains a separate user decision.
