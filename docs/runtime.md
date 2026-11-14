# Runtime composition progress

createRuntime explicitly composes configuration, observation and scheduling ports. Each tick resolves empire scheduling configuration and per-room configuration/diplomacy, observes rooms, creates room-scoped feature jobs and synchronizes the scheduler while preserving existing due times. Feature contexts receive the current tick view, room view and effective configuration. Removed rooms lose ephemeral scheduled jobs; newly observed owned rooms acquire jobs. No service locator or game global is used in app/runtime.

Tests exercise two rooms across two ticks with one throwing feature; the independent room continues and original room diagnostics are retained. Targeted app/core/smoke: 6 tests pass in 219ms; quality passes.

Still incomplete: main.ts uses the packaging scaffold; production composition wiring follows. Scheduling currently uses empire limits; room-level background overrides need admission integration before ED-15 acceptance. Observation failures are returned on the world view and need diagnostic reporting at the outer boundary. Repeated-tick and dynamic-room fairness need integration tests. No gameplay features are registered yet.
