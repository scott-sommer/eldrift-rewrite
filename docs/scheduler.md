# Scheduler contract

Core scheduling accepts explicit jobs and CPU/diagnostic ports; no game globals. IDs are unique across room/feature work. Intervals are positive integer ticks. Background start phases use a deterministic ID hash; overdue jobs retain their due time until attempted. Sorting urgent first, then oldest due, then ID gives waiting background jobs a turn when a recurring budget admits only part of the queue. There is no fairness guarantee when urgent work consumes all available capacity indefinitely.

Before each job, the scheduler checks used CPU against tickLimit. Background jobs additionally require an enabled policy, sufficient bucket and used CPU below the configured fraction of tickLimit. This is cooperative admission control: a synchronous job cannot be preempted, so feature work must itself be bounded. Budget input comes from validated configuration and a runtime CPU adapter. No actual engine CPU measurement is claimed yet.

Exceptions are reported with work ID, optional room, tick and original error object/stack. Remaining jobs continue. Failure records are also returned so a broken diagnostic sink cannot erase them or abort independent work. Attempted failures are rescheduled at their interval rather than retried in the same tick. Scheduler state is reconstructible process-local state; reloads reset staggering. Integration with tick views and composition remains ED-15 work.

Validation: quality passes with zero Lizard violations; scheduler + smoke 5 tests passed in 214ms. Tests cover precedence, constrained-capacity fairness, bucket/hard-budget gates, feature failures and diagnostic-sink failures.
