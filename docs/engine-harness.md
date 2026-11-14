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
