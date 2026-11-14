# Runtime composition progress

createRuntime explicitly composes configuration, observation and scheduling ports. Each tick resolves empire scheduling configuration and per-room configuration/diplomacy, observes rooms, creates room-scoped feature jobs and synchronizes the scheduler while preserving existing due times. Feature contexts receive the current tick view, room view and effective configuration. Removed rooms lose ephemeral scheduled jobs; newly observed owned rooms acquire jobs. No service locator or game global is used in app/runtime.

Tests exercise two rooms across two ticks with one throwing feature; the independent room continues and original room diagnostics are retained. Targeted app/core/smoke: 6 tests pass in 219ms; quality passes.

Still incomplete: main.ts uses the packaging scaffold; production composition wiring follows. Each room job now carries its resolved background policy; CPU fraction, bucket threshold and enabled state use room precedence while the hard tick CPU limit stays global. Deferred jobs keep their due time. Observation failures are returned on the world view and need diagnostic reporting at the outer boundary. Integration tests verify constrained-budget fairness survives job synchronization and newly visible rooms replace removed room jobs. No gameplay features are registered yet.


Latest validation: app/core/smoke 8 tests pass in 231ms; quality passes. Room-policy tests include disabling one room without blocking another and resuming deferred work after re-enabling it. Config providers must supply complete layer inputs for each room, including shared empire/environment values; production provider wiring remains outstanding.

Production entry point now invokes createGameLoop with current-tick Screeps adapters. Configuration provider preserves shared environment/empire layers while selecting room profiles and overrides; main currently supplies an empty store (defaults). Persistent configuration storage is ED-16/operator integration work. Observation and top-level runtime failures reach the injected diagnostic boundary. The packaged loop runs against a minimal synthetic Game without Node globals; this is not a real engine test.

Latest full validation: 83 tests passed in 1.85s; quality passed; bundle check passed. No gameplay features are registered. Earlier paragraphs describing scaffold-only main wiring are historical and superseded by this entry.

Repeated runtime calls in the same tick now reuse the completed result, avoiding repeated scans/actions. Configuration changes therefore take effect on the next tick. Deterministic staggering is tested across different registration orders. Full suite: 85 passed in 1.84s; quality and bundle checks passed before the test-only clock correction. A diagnostic scenario was corrected to advance its tick when changing configuration; all tests then passed. Runtime acceptance review remains separate from gameplay/engine parity.


## Explicit visible-room lifecycle scope

RoomFeature.scope is optional and defaults to owned-room execution. Features explicitly declaring scope: 'visible' are scheduled for successfully observed visible rooms, using that room's resolved configuration and the same failure isolation/CPU scheduler. Ownership loss removes ordinary economy jobs but retains visible lifecycle jobs; loss of visibility removes both. Observation failures do not authorize work on missing rooms. upgrade-parking is the first consumer, allowing surviving specialists to clear an unowned controller even when the player has no remaining owned rooms. Tests cover owned→visible-unowned→unseen→owned transitions.
