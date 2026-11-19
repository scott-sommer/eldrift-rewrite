# Real-engine harness status

ED-14 uses screeps-server-mockup 1.5.1, isolated in tools/engine with its own exact dependency lock. Native Windows execution and the nine-scenario suite are verified below. Initial dependency resolution skipped install scripts; the subsequent native installation and actual engine runs establish compatibility.

Primary source: https://github.com/screepers/screeps-server-mockup documents tick-by-tick private-server execution and native compiler prerequisites. The local machine has Visual Studio 2019 BuildTools with the C++ component. Node is 24.22.1. WSL lists no installed distribution; Docker was not found on PATH.

The root fast test loop remains independent of native engine dependencies. Dependency resolution and VM bundle checks alone do not count as real-engine evidence.

## Native Windows route verified

`npm ci --prefix tools/engine --no-audit --no-fund` completed in approximately three minutes on Node 24.22.1 with VS2019 C++ BuildTools. `node tools/engine/probe.cjs` loaded isolated-vm, evaluated code in a native isolate, and loaded the server constructor. Resolved versions: mockup 1.5.1, engine 4.3.2, driver 5.3.0, common 2.16.1 (full graph in the isolated lock).

`npm run test:engine` builds the actual bot and runs three private-engine ticks with a 60-second timeout. First verified run advanced time 1→4, persisted Memory.eldrift and operator/config, reported no console logs, and serialized 97 bytes of bot memory. Artifacts are written under artifacts/engine-*; the runner stops its harness processes on exit. It uses local storage port 32147 and must run serially. No official shard connection or upload occurs.

This is initial engine smoke evidence only: no gameplay features are registered, CPU/soak measurements and scenario/reset/migration coverage remain pending. Native install script permissions may need explicit approval under future npm policies; the binding probe is the authority for a usable install, not npm exit status alone.

The harness User console event omits the driver's top-level error payload. The runner therefore subscribes to the raw per-user console channel and rejects engine exception events before checking Memory. Negative control `node tools/engine/smoke.cjs --inject-error` wraps the packaged loop with ENGINE_SENTINEL: all three ticks report the sentinel and the runner exits 1 at the engine-error assertion. Normal packaged execution still exits 0. This validates the failure detector rather than inferring success from advancing world time.

Reports now include Git commit/dirty status, SHA-256 of the executed bundle and engine lock, Node/platform, engine/driver versions, and per-tick engine lastUsedCpu, end-of-tick memory bytes and host wall duration. Missing/non-finite CPU values fail the run. Initial three-tick instrumentation run measured engine CPU 3/1/1 ms and memory 97/97/97 bytes; host tick durations were approximately 189/9/9 ms. These are scaffold-only samples with startup cost, not gameplay performance budgets or a soak result. Reports retain raw samples instead of implying representative averages.

Every run reaching runner initialization now writes evidence.json on normal completion, caught failure, server error or timeout, retaining collected engine errors/logs, partial samples, available provenance and failure stack. Negative-control artifact was inspected: failed status, three ENGINE_SENTINEL events and the engine-error assertion stack were present. A subsequent normal run passed. Abrupt OS process termination cannot guarantee final artifact writes.

`node tools/engine/smoke.cjs --reload` now exercises an actual engine isolate reload via the installed backend's code-update mechanism (code timestamp plus cached-script invalidation). Tick 2 saves backgroundEnabled:false using the engine console; tick 3 loads the packaged code plus a test-only module-load witness, proving new module execution and preserved configuration. The run passed with memory97→133→181bytes; the witness accounts for final extra bytes. evidence.json records the instrumented reload bundle hash separately. This tests code-reload reconstruction, not process crash recovery or complete legacy migration.

Timeout/cleanup evidence: --inject-timeout stalls after server start and uses a 1.5-second watchdog. The actual run exited1 with a timeout failure artifact; all three recorded child PIDs (storage, runner, processor) were absent after cleanup. A subsequent normal run reused the local port successfully. Child PIDs are now recorded in evidence.json for cleanup audits. This exercises an asynchronous stall, not an uninterruptible native/OS hang.

Installed @screeps/storage/lib/index.js binds STORAGE_HOST or localhost; this harness does not override STORAGE_HOST. Its disposable directories are independent of any future persistent visual/soak server. No credentials are required for this local runner. Native Windows works, so a WSL installation is unnecessary for this route.

## Repeatable scenario suite

Run `npm run test:engine:suite` after installing root and tools/engine dependencies. It builds production once, runs scenarios serially on the shared local port, checks each evidence artifact and expected exit status, and writes artifacts/engine-suite.json. Included: packaged smoke, code reload, raw harvest/conflict, persisted harvest task, build/repair/upgrade, withdraw/delivery, movement, injected exception and watchdog timeout. Negative controls must fail for their expected reasons; a nonzero exit alone is insufficient. Outer process timeout is90s, above the runner's60s watchdog.

Measured on this machine: all9 checks passed in8.01s (scenario loop, build excluded). Full fast suite169 tests passed in2.45s. These are small fixture scenarios, not parity or soak coverage. ED-12 remote checks subsequently passed on Windows and Linux in run 43588369374 at commit 8eb095c. This resolves that prerequisite; engine execution evidence is local Windows evidence, not an engine CI result.


The suite additionally includes --maintenance: a test fixture seeds reservation state and invokes production main over three ticks. It asserts exact-boundary expiry with a longer-lived claim retained. All ten checks passed in 8.71s after this addition (scenario execution, build excluded).

The --retirement fixture adds an owned creep in a disposable world, invokes production main, and issues suicide. Subsequent ticks verify the local roster and task queue are cleared and only that creep's claim is released. Eleven scenarios passed in 9.58s with this case included. No live shard was contacted.

--recovery uses six ticks (other current scenarios use three) and verifies repeated blockage followed by occupancy-aware rerouting around an unchanged stationary creep. The suite now contains13 checks and passed in11.60s. Reports include the scenario's actual tick count.


## Aggregate failure reporting

The suite now replaces artifacts/engine-suite.json with status=running before the first child. Each completed case persists its evidence path. A failed child/assertion writes status=failed, activeScenario and the failure stack while retaining prior successful cases. Only successful exhaustion writes status=passed. A killed parent can leave running, which is not completion evidence. The standalone node --test tools/engine/suite-report-check.cjs regression verifies stale-success replacement, partial evidence, failure and subsequent success lifecycle. Normal npm run test:engine:suite uses this reporter automatically.

At production8e56274 the construction milestone aggregate stopped at --stamp-budget after1600ticks without a receipt; the captured checkpoint had evaluated one candidate. An isolated unchanged rerun committed at1179 with the original1600tick limit. Both traces/provenance are retained in docs/evidence/construction-stamp-budget-regression.json. This is unresolved timing sensitivity, not proof of a deterministic runtime regression or a successful aggregate. ED-43 must qualify repeated default-budget completion and setup/checkpoint costs; no limit was relaxed.

Validation: reporter lifecycle1test passes (115.98ms overall); full unit1,070tests/313files passes7.97s. Quality499production/449testfiles passes with zero Lizard violations. Initial placement of the Node-only check under Vitest discovery caused an empty-suite failure; naming it suite-report-check.cjs and invoking it explicitly from the engine-suite script separates the two runners. No production bot code or scenario deadline changed.


## Retained-candidate persistence cost correction

The clean cfe63f8 aggregate failed again at --stamp-budget after46successful cases (239.56s). The captured database had reached candidate2 with a330-entry retained best. The running report became failed with the active case, confirming stale success is no longer reported. Both aggregate failures remain evidence; the earlier isolated success did not establish stability.

Planning job wire schema3 serializes best/previous proposals independently. Checkpoint cursor, pending evaluation, signature and diagnostics keep their existing representation. Full store reads parse bounded JSON and validate retained proposals against the same plan/seen-candidate rules. Writes and finish validate current decoded state before replacing it. v1/v2 migration preserves job revision, pending state and both retained candidates; malformed old state never writes partial migration. Receipt-only admission validates envelope/header and does not materialize retained plans. The planning cycle consumes only read/save/clear/finish ports. No global immutable-state assumption or schema-validation bypass was introduced.

A captured native-memory-shaped local benchmark measured mean read cost0.993ms before and0.478ms after (50samples after10warmups; same330-entry fixture, Node24.22.1). The checked-in command node tools/measure-planning-job.mjs reproduces the current read measurement against docs/evidence/planning-job-read-fixture.json; its later current-code run measured0.494ms. These are local Node persistence timings, not native whole-tick CPU or a strict3CPU guarantee. The before measurement was executed before the source changes, using the same captured record and loop, and remains archived.

Native qualification under unchanged defaults/tick limits: --stamp-budget commits1076; --stamp-late-reset commits1057 with complete canonical plan equality to the first run; --planning-job preserves checkpoint/reload witnesses, selected constrained plan and recovered commit; --planning-cpu preserves state during injected termination and resumes to completion200. Engine error diagnostics in the CPU case are expected fault injection. docs/evidence/planning-retained-codec-native.json retains case provenance, traces and the failure. These are dirty-checkout targeted runs, not a clean full aggregate.

Validation: full units1,073tests/314files8.19s; quality500production/451testfiles zero violations; focused migration/store/cycle plus smoke19tests273ms. New regressions cover both retained plans through v1/v2 migration, detached data, corrupt JSON/invalid plan/unseen-candidate rejection before read/write/finish, and no partial invalid migration. The native job assertion now expects wire version3; other acceptance assertions are retained. Clean full-suite validation and ED-43 repeated/pressure/soak acceptance remain required.


### Read-only fixture aging

The --scout-lifecycle scenario explicitly calls the pinned driver's activateRoom for its rooms before each tick. getAllRoomsNames consumes the active-room set; read-only observation code emits no room intents to populate it. Without explicit activation, fixture creep lifetime can fall below zero while its object remains present. Do not infer death from predicted expiry or vision loss, or claim natural-expiry evidence from that setup. The scenario separately exercises the real creep tick processor's natural expiry, a test-injected native suicide, module reload, and later actual vision loss. See docs/evidence/scout-lifecycle-native.json for diagnostic failures and corrected evidence.


### Scout exploration terrain halo

The new --scout-explore fixture supplies terrain beyond its accepted path corridors. The pinned driver's native/src/pf.cc room_index_from_pos dereferences terrain before invoking roomCallback; a sparse mock world can throw while considering an adjacent room that the callback would reject. Retain complete fixture terrain for those candidates and assert zero reported unit errors, not only zero uncaught engine exceptions. docs/evidence/scout-runtime-native.json retains the initial error-loop diagnostic and corrected default-depth progression. Production route admission still excludes rooms outside its explicit corridor.


## Long workforce traces and border recovery

The lifetime fixture streams every per-tick row to the host, retaining unique native attempts once and checking repeated unrelated-queue/state invariants in the bot. It does not raise native Memory limits. Pending confirmation snapshots remain explicit and global resets still occur before confirmation; old acknowledged journals need not be copied into every row. The lossless 1,750-row archive is checked against its digest and consecutive tick indices.

Use the 20-tick remote-fleet-border case for the tight diagnostic loop around arrival-edge direction, actual landing and traffic denial. The full lifetime case verifies distinct successors for each original and cargo-safe retirement through normal TTLs. Recovery/service-recovery timing checks now reflect immediate avoidance after one confirmed denial while retaining fatigue, blocker, duplicate-call, arrival and reset invariants.

Clean ed82a98 passes all 211 engine checks in 1,193.06 seconds, including the expected failure sentinels. Per-case clean provenance and digests are archived in evidence/remote-lifetime-engine-suite.json; exact native traces are in evidence/remote-lifetime-native.json. Fixture trace samples include probe overhead and do not establish production CPU/Memory pressure or soak acceptance. Continue focused plus broad smoke checks during ordinary iterations; the full engine suite is a larger runtime milestone gate.

## Remote timing upgrade regression

The --remote-fleet-migration scenario reconstructs schema-1 travel/cache/fleet state at tick 100 during native service, then exercises schema-2 invalidation and remeasurement through the ordinary main loop. Cargo, lifetimes, assignments and journals are not replaced by the upgrade fixture. The existing receipt conservation, ownership, unrelated queue/state, reload and final cleanup checks remain active.

Clean 29d3cfd passed the expanded 212-case suite in 1,209.91 seconds. evidence/remote-timing-engine-suite.json records every outcome and clean bundle provenance; evidence/remote-timing-native.json retains assessment, upgrade and lifetime traces. The injected error/timeout cases pass only when their intended failures are detected. Use focused cases during development; repeat the full suite at larger runtime milestones.

## Automatic construction milestone

Use --remote-road-auto for the 450-tick main-loop spawn/build/remote-loaded-withdrawal/refund scenario and --remote-road-admission for its 160-tick underfunded/disabled/unaffordable stages. The earlier --remote-road-work case retains a pre-existing actor to isolate the service cycle. Do not substitute that service fixture for actual population qualification. All work/refund accounting uses native unboosted construction cost: one energy per progress, with 300 per plain road.

Clean 672077c passes the full 216-case suite in 1306.38 seconds. evidence/remote-construction-engine-suite.json records per-case provenance/digests and expected failure sentinels; evidence/remote-construction-native.json links exact automatic/admission/fleet-budget traces. Every construction row checks stock + carried supply + completed/partial construction against initial storage, separately from spawn cost. Refunds are not remote income. Continue focused plus fast smoke checks during iteration and reserve the full suite for larger runtime milestones.

Latest management milestone: clean6bcfa0e passes218 native cases in1287.44s, including --room-reservation schema3 migration and current-controller quote refusal/recovery. See evidence/room-reservation-engine-suite.json for all outcomes and evidence/room-reservation-native.json for exact28-tick rows and limitations. This supersedes the216-case construction baseline as the broad regression result; automatic reserver population remains unqualified.

The --reservation-selection fixture adds a32-tick configurable quotation/management path with affordability, stable complete-sweep publication, disable/re-enable and three module reloads. Clean focused evidence at8300dca is in evidence/reservation-selection-native.json. Registry219; latest full qualification remains218 cases at6bcfa0e. Automatic population is not part of this fixture.

Latest clean a376519 passes all 222 native cases in 1358.47s. Reservation population scenarios cover 900-tick natural replacement/funding/recovery, 120-tick negative admission and 48-tick in-flight cancellation. Cache upgrade is included in --reservation-selection. Full provenance and exact traces: evidence/reservation-population-engine-suite.json and evidence/reservation-population-native.json. Combined discovery/extraction income and ED-43 pressure/soak remain open.

Latest clean39722c0 passes223 cases in 1487.75s. --remote-pipeline exercises1000 ticks of ordinary scouting/discovery/extraction/delivery/reservation and loaded withdrawal without seeded remote workers/leases. Evidence: remote-pipeline-qualification.md and evidence/remote-pipeline-native.json. The fixture supplies a developed home and prebuilt remote container; it is not full infrastructure payback or ED-43 performance evidence.

--reservation-vision adds550 ticks of genuine sensor departure/re-entry, stale restart refusal, hostile observation and fresh-generation recovery. Five clean focused native regressions pass at83c0112; see evidence/reservation-vision-native.json. Registry224 was not rerun in full for this harness-only increment; production source matches the full223-case39722c0 baseline.
