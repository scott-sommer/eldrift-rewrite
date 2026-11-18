# Automatic remote discovery and runtime management

ED-29 remains in progress. The standard main loop now registers a default-off, owned-room remote-management feature. Enabling remoteManagementEnabled connects admitted graph discovery to the existing bounded source scan, portfolio selection and scoped lease owner. Recruitment, task execution, reserver feasibility/pricing, adaptive support capacity and full remote acceptance are still pending. Enabling this management stage does not spawn remote workers or build its desired infrastructure by itself.

## Separation and configuration

features/remotes/discovery owns its bounded persistent breadth-first frontier. Its ports supply cardinal exits and admission; physical adjacency cannot invent a diagonal shortcut around a blocked corridor. Progress can resume within an exit row after CPU admission ends. Unknown/blocked rooms cannot become corridors. Discovery publishes only after the bounded graph pass is complete; a periodic refresh retains the preceding published set while it scans. A changed policy clears that publication. Room caps report truncation explicitly.

app/remotes/discovery supplies current/retained intel and the same known-safe traversal rules as remote work. A request's traversal-budget exhaustion pauses the current neighbor, rather than incorrectly treating it as hostile. Discovery consumes existing intel/vision; scouts and observers retain responsibility for obtaining vision.

The feature uses the normal layered runtime configuration. src/config/remotes.ts defines defaults, bounds and controls for activation/minimum RCL, cardinal depth/read/room/refresh budgets, scan room/source budgets, CPU/path/route budgets, lease/scan/reassessment timing, slot/hauler/spawn/net-yield budgets, ordering/completion preference, miner/courier body budgets, infrastructure flags, blocked rooms and expected infrastructure/risk expenses. Lease lifetime must exceed the configured scan plus reassessment windows. Arrays are copied/frozen by the existing configuration provider. The ordinary runtime policy currently excludes keepers and does not request reservation work; specialist/reserver population policies remain explicit follow-up work.

Registration stays separate from activation. Default-off runtime tests require no game globals and no persistent state reads. Zero CPU budget performs no discovery/management writes. Disabling stops further manager updates/renewals; it does not delete manual or other owners' leases. Existing managed leases retain their prior expiry. Upcoming worker execution must independently honor activation and retirement policy.

## Progress under bounded CPU

The first real runtime probe exposed repeated travel work under the five-millisecond default deadline. Native management now persists completed miner/outbound/loaded-return legs in one active-source cache per home. Identity includes endpoints, route, static topology and the measured body/economic policy. CPU deferral resumes the next leg; incomplete paths never become complete legs or profit certificates. The base assessment service remains read-only by default; only the management composition injects this progress owner. Travel progress does not allocate a growing namespace per source.

Current native safety checks share immutable tick facts and traversal decisions across quotes, while assignment and scan revisions remain independently checked before publication. Exhausted admission aborts the whole commit. A zero-slot policy immediately publishes an empty managed portfolio instead of repeating source searches; unrelated leases keep their exact identity and expiry.

## Native scenario and limitations

The registered-main-loop scenario uses default remoteCpuBudget=5 and three actual sources in two connected remote rooms, with one graph read and one source assessment per call. Its bounded 100 ticks include global resets at 2/8/21/41/60, a zero-CPU window at 10–15, a blocked intermediary that also makes the farther room unreachable, subsequent recovery, immediate zero-slot cancellation, renewed selection and management disable after observed recovery. Policy transitions follow observed milestones within the fixed overall scenario bound. A manual lease keeps expiry tick 31 and an unrelated sentinel remains unchanged.

Initial runtime probes engine-B8HtYf, engine-Eo3mX2 and engine-VTmju0 are retained as development evidence: they exposed travel deferral, unnecessary work before zero-budget cancellation, and a fixture transition racing the next publication tick. No bot exceptions occurred. They were addressed by saved travel legs, immediate zero-slot handling and event-driven fixture phases, without increasing the CPU allowance. The subsequent 72-tick developmental run engine-fMHjoa passed; final qualification uses the bounded 100-tick version.

This scenario proves functional progress under one configured default-budget test world, not pressure/soak or production CPU/Memory acceptance. Trace snapshots add fixture overhead. Automatic vision acquisition, reachability-life feedback, damaged/spawning-worker cancellation, production recruitment/replacement, combined mining/transport/construction orchestration and public control translation remain open. Exact committed-source regression evidence is recorded after qualification.
