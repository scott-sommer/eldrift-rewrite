# ED-17 execution foundation acceptance

The pure transition runner is reusable by creep and mission domain handlers without importing either policy. Persisted creep queues use tagged version-2 task records; mission state remains separately owned. This foundation does not implement mission tactics or register production creep behaviors.

| Requirement | Evidence |
| --- | --- |
| Explicit outcomes, validity and retry bounds | core/execution/execute tests cover transition caps, sleeping/retries through serialized checkpoints, expiry, unknown phases and invalid clocks. Persistence task/version tests cover schema versions and invalid records. |
| One owner and compatible action budgets | action-arbiter tests cover owner/slot conflicts, tick reset, rejection fallback and uncertain exceptions. Screeps economy adapter supplies concrete compatibility slots. Real-engine actions fixture confirms harvest effect and conflicting work rejection. |
| Composable movement/resource/work | Role-independent capability tests and engine movement, resources and work scenarios prove observed completion after accepted intents. Travel completion does not complete the parent work task. |
| Cancellation and death release | cancel-task test replays interrupted cleanup and retains sibling tasks/claims. Unit-lifecycle tests cover queued-task retirement and name reuse; actual-engine retirement confirms local claim release. |
| Multi-tick edge cases | task-runner test covers blocked/sleep/retry/reset/completion. task-target-loss test covers accepted work followed by JSON reset and target disappearance: only the active task fails/releases its claim, queued work stays intact and does not execute again that tick. execute tests bound already-complete transition chains. |

Validation: npm run quality passes with zero Lizard violations; full suite passes 176 tests in 2.50s. Most recent production engine suite passes 11 scenarios in 9.58s, including work/resource/movement effects, persisted task execution, reload, death, exception and timeout checks. The added target-loss test changes no production code.

Limits: engine scenarios use small deterministic fixtures; movement routing is injected, not yet a pathfinder. Traffic, detailed combat compatibility, role policy, mission policy, queue producers, and production behavior registration remain capability work. Shared action arbitration is required at composition boundaries; creating an arbiter per role would defeat ownership. Primitive tests do not prove a self-sustaining colony, mission parity or end-to-end release readiness.
