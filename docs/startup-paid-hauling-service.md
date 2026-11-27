# Paid hauling forecast service

## Responsibility

`app/remotes/startup/hauling-state/service.ts` executes one ordered private task-service frame. The seed supplies its home and opening clock. Injected ports own physical observations, transfer/movement intents, trip policy, source approach and authority. The service reuses `settleHaulingTask`, `createHaulingTaskBehavior`, `createTaskRunner`, `submitHaulingTask` and the existing task/request/quantity owners rather than introducing another request lifecycle.

Explicit visits retain caller order and distinguish an actor visited with productive execution deferred from an actor not visited at all. Settlement occurs before execution deferral and task expiry. Existing tasks never enter recruitment during their completion frame. A later admission is clipped by the actual booking policy and minimum batch; an already assigned container task retains its own collection behavior. Source approach can retain work while the source is unseen instead of falsely interpreting inaccessible stock as empty. Task closure cancels its request through the existing owner.

Physical views and effect observations must match the current frame. Duplicate, unknown and nonconsecutive visits refuse. Authority failure or any exception during a partially executed frame invalidates the service instance; subsequent frames cannot continue that forecast. This refuses financial assumptions rather than pretending cleanup has been modeled.

## Shared movement

`advanceTransitFrame` accepts an optional explicit list of requested units. A route being ready no longer forces a caller using this list to move the worker: only service-requested movement enters the same traffic solver. All other bodies remain occupants and recover fatigue. Omitting the list preserves existing callers' behavior.

The physical owner must evaluate actors against the opening physical frame, collect stage/approach/action intents, and flush movement and resource effects only after actor service. It must include requests made by preparation and idle/admission ports, not only transfer approach. Do not mutate source inventory mid-actor-order to make same-frame miner production available early.

## Verification and limits

Relevant state/service/transit/group tests:25 tests in four files passed in550ms. Coverage includes real task admission/runner/reservation ownership, completion-frame delay, new-trip minimum batch, clipped requests, outside capacity claims blocking movement, actual shared transit resuming after booking renewal, actor-order stock competition, pre-expiry settlement, deferred/unvisited actors, unseen-source preparation, authority/clock invalidation, stationary occupancy and fatigue recovery.

Fixed smoke76 tests/15 files passed in514ms. Type checking, lint, architecture boundaries, Lizard (1137 production/951 test files; zero violations) and packaged bundle passed. Full units remain reserved for milestones/ticket closure. No native qualification is claimed for this service component: its injected world is currently exercised by targeted tests. Earlier native seed evidence remains limited to its recorded source.

Next: compose this service with a canonical shared inventory and body/movement owner, journaled next-frame transfer effects, actual recruitment policy and one home sink/spawn/cash timeline. Then compare future source-attributed settled receipts against native execution, preserve checkpoint/resume, and qualify full horizon, multiple sources, lifecycle cleanup and strict5ms operation. Financial admission and live deployment remain disabled.
