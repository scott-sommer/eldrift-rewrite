# Runtime composition progress

createRuntime explicitly composes configuration, observation and scheduling ports. Each tick resolves empire scheduling configuration and per-room configuration/diplomacy, observes rooms, creates room-scoped feature jobs and synchronizes the scheduler while preserving existing due times. Feature contexts receive the current tick view, room view and effective configuration. Removed rooms lose ephemeral scheduled jobs; newly observed owned rooms acquire jobs. No service locator or game global is used in app/runtime.

Tests exercise two rooms across two ticks with one throwing feature; the independent room continues and original room diagnostics are retained. Targeted app/core/smoke: 6 tests pass in 219ms; quality passes.

Still incomplete: main.ts uses the packaging scaffold; production composition wiring follows. Each room job now carries its resolved background policy; CPU fraction, bucket threshold and enabled state use room precedence while the hard tick CPU limit stays global. Deferred jobs keep their due time. Observation failures are returned on the world view and need diagnostic reporting at the outer boundary. Integration tests verify constrained-budget fairness survives job synchronization and newly visible rooms replace removed room jobs. No gameplay features are registered yet.


Latest validation: app/core/smoke 8 tests pass in 231ms; quality passes. Room-policy tests include disabling one room without blocking another and resuming deferred work after re-enabling it. Config providers must supply complete layer inputs for each room, including shared empire/environment values; production provider wiring remains outstanding.
