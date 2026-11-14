# Real-engine harness status

ED-14 selects screeps-server-mockup 1.5.1 as an initial compatibility candidate, isolated in tools/engine with its own exact dependency lock. This is not yet a validated runner. Install scripts were deliberately skipped during dependency resolution; no engine tick has run.

Primary source: https://github.com/screepers/screeps-server-mockup documents tick-by-tick private-server execution and native compiler prerequisites. The local machine has Visual Studio 2019 BuildTools with the C++ component. Node is 24.22.1. WSL lists no installed distribution; Docker was not found on PATH.

Next: attempt native installation in this isolated folder, capture exact incompatibilities, then validate packaged bot execution with bounded ticks and explicit process cleanup. Retain the root fast test loop separately. Do not call dependency resolution or a VM bundle check real-engine evidence.

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
