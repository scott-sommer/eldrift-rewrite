# Real-engine harness status

ED-14 selects screeps-server-mockup 1.5.1 as an initial compatibility candidate, isolated in tools/engine with its own exact dependency lock. This is not yet a validated runner. Install scripts were deliberately skipped during dependency resolution; no engine tick has run.

Primary source: https://github.com/screepers/screeps-server-mockup documents tick-by-tick private-server execution and native compiler prerequisites. The local machine has Visual Studio 2019 BuildTools with the C++ component. Node is 24.22.1. WSL lists no installed distribution; Docker was not found on PATH.

Next: attempt native installation in this isolated folder, capture exact incompatibilities, then validate packaged bot execution with bounded ticks and explicit process cleanup. Retain the root fast test loop separately. Do not call dependency resolution or a VM bundle check real-engine evidence.
