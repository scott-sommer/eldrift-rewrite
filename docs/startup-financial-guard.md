# Durable financial birth guard

ED-29 remains In Progress. Source 080b068db7d02712b220edcc5b0bfce705d9c479 makes economic admission a persisted request constraint. SpawnAdmission is a small tagged union: household-labor keeps task/publication authority, and remote-startup carries generation and observedAt. It contains no duplicate capital ledger or cached acceptance flag. The latter tag binds the cohort observation, not a zero-based forecast frame. Strict validation rejects ambiguous keys, malformed clocks and unsupported tags. Semantic request comparison ignores admission object property order while comparing every defined field.

## Publication and final spending

RemoteFleetBirthPolicy.cohort supplies the marker after preparation. Common population demand publishes it with the ordinary identity/queue owner. Recruitment preserves already marked requests when the selection policy is absent or changes geometry/body; it cannot silently replace that request with unguarded demand. Existing explicit withdrawal, over-target/expired demand reconciliation and exact cohort maintenance remain cancellation owners. An incompatible preserved request is refused at dispatch rather than reinterpreted as a payable ordinary request.

Final remote dispatch refuses marked requests with a non-fleet owner, wrong current generation, future observation epoch, absent economic callback, absent selected placement or an explicit non-true callback result. The forecast admission reader additionally requires the exact approval generation and observation epoch, original full request, current configuration/topology, current lease/body and exact birth slot plus observed prior births. Existing safety/route/workforce/physical-energy gates still apply. Losing configuration or an approval reader cannot make a marked pending request fall through to ordinary allocation. Deliberately configured new ordinary requests remain a separate policy decision; this increment does not implement the default economic mode or its full mode-change lifecycle.

The independent household guard recognizes only household-labor tags. A remote tag cannot borrow an awaiting household task. Publication cleanup similarly requires household authority before looking up a task. These guards share the dispatcher without granting one feature the other's task ownership.

## Queue migration and rollback

The population-owned spawning/<home> queue advances from version 4 to version 5. V4 ordinary and household requests migrate with their metadata intact. A remote-startup tag found inside a declared V4 record is rejected without mutation. Earlier migrations remain chained through their original unsupported-field refusals. Readers pinned to V4 refuse the V5 envelope, including an otherwise ordinary queue, before reading requests.

ED-44 must rehearse this upgrade and rollback with active financial requests, completed approvals, partially paid cohorts and useful cargo. Never relabel a V5 envelope as V4, remove its markers or delete its approval to bypass the refusal. Reconcile/fence unstarted financial requests through their owners and preserve already paid bodies/cargo before an explicitly audited downgrade. The queue migration and older-reader refusal are tested locally; a complete installed-release rollback rehearsal remains open.

## Evidence

The source-qualified manifest evidence/startup-financial-guard.json archives three clean passes on 080b068:

- --remote-pipeline-approval1000 (engine-ZLIUQ9): all three forecast/publication requests carry generation31/observation32; queue5 is observed; scratch removal40 and later paid slots53/65 survive reloads. All65 receipts through799 match3758 delivery,3960 harvest and88 repair. Withdrawal800 cleans scoped work; physical home closes12769 from10300+3822-1150-200-3.
- --remote-pipeline-economic-change180 (engine-h5lNFb): actual reserve change50 cancels exactly unpaid requests5/6, retains occupied miner4 and no conflicts. Restored policy60 still refuses the missed cohort. Withdrawal120 returns40 income; final home9387, no pending remote requests or mining/quantity claims; unrelated work/sentinel survive.
- --remote-transport240 (engine-7kTXqI): ordinary remote transport regression passes with the new queue schema and independent guards. This is compatibility evidence, not an economic approval scenario.

Targeted51 tests across11 directly affected files pass722ms; after final helper extraction the affected guard/admission subset15/4 passes466ms. Smoke remains76/15 and passes507ms. Quality/type/lint/boundaries/Lizard pass (1029 production/884 test files,0 violations), bundle passes and report integrity1 passes132ms. No full units or registry were run for this increment and no ticket is closed. Missing-callback/selection refusal and metadata-preserving recruitment are targeted contract tests, not a native mode-switch fault campaign. These native fixtures retain their explicit100ms planning budget and do not qualify default-budget CPU or colony-scale Memory.

Next connect bounded future-scheduled proposals and retained approvals to a configured default economic cohort controller, with deadline cleanup, incumbent-aware replan and shared current capital. Broader household/reservation/replacement/infrastructure schedules, shared multi-source capital, long-route and alternate-home qualification and the ED-29 closure audit remain required.
