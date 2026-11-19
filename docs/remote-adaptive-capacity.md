# Adaptive remote source capacity: policy layer

ED-29 remains In Progress. This increment implements policy and bounded observation storage only. Main does not yet register an adaptive evaluator or observer, and no configuration flag currently activates these modules. It is not native-engine qualification or completion of adaptive capacity or reachability parity.

## Responsibilities

`features/population/spawn-load` owns trailing spawn occupancy history, independent from remote strategy. `features/remotes/capacity` owns the supported source count, evaluation clock and last evaluated load. `portfolio` enforces an optional `maximumSources` independently from slots, haulers, spawn throughput and total workforce. Two source miners plus a one-slot room commitment therefore require two supported sources and three workforce slots. Atomic rooms still cannot fragment to fit a reduced source budget.

A history sample is a half-open one-tick observation. Adjacent identical samples merge into one segment. Trimming keeps at most 1,500 segments; the worst case alternates every tick. Observation gaps remain gaps. Detached reads and persisted validation prevent mutation through snapshots, overlapping history, wrong owners, unknown future schemas and corrupt records. Duplicate or backwards samples do not rewrite history. Capacity saves require a current revision and non-regressing clock.

## Ported decisions and deliberate corrections

The legacy reference and exact source locations are in remote-adaptive-porting-audit.md. Evaluation initializes three sources and an evaluation timestamp, then waits a configured interval (the planned default is 1,500 ticks). At full observation coverage, load <= .75 adds one; load >= .90 removes one; the interior band holds. Capacity has a zero floor and an explicit configurable maximum bounded by the portfolio inventory limit of 128. Missing observations or no current physical spawn hold an established allowance. Controller levels below three expose two sources; level three exposes three while its stored adaptive value can evolve; level four and above expose the stored value. This preserves the legacy distinction between the getter and evaluator.

Unlike additive legacy duration events, the observation model cannot count a single spawn as both occupied and starved in the same tick. It divides occupied plus energy-starved spawn ticks by 1,500 times current spawn count, preserving the legacy denominator, and clamps to one after capacity loss. This corrects overlapping event accounting. No claim of equivalent measured values is made before native qualification.

## Required native integration

Register an owned urgent evaluator separately from optional background discovery. At tick T evaluate the closed window ending T-1, then record T after dispatch. First evaluation at tick one and first adjustment at tick 1,501 should therefore use exactly 1,500 observations. Resolve settings per home; default-off homes must not open these new state namespaces. Decorate the management portfolio source cap without replacing existing slot or workforce limits.

The observer must combine actual active spawn occupancy with dispatch reservations after flushing effects. Count ready, affordable-at-full-room-capacity demand that the allocator skips for insufficient available energy. Measuring only native ERR_NOT_ENOUGH_ENERGY would miss that demand. Use the existing same-tick energy ledger and do not call stateful final admission twice. Exclude born names, expired/not-yet-ready requests and impossible bodies. Document the treatment of cancellations and uncertain native effects. Isolate observation failures per home and refuse corrupt history rather than silently resetting it.

Next qualify native idle and energy-starved homes over 1,505 ticks, including allocator-skipped queued pressure, persistence reloads and default-off behavior. Keep observations compact. Full-life reachability feedback is a separate remaining port: actual source arrival or a never-arrived miner's final lifetime tick, with two consecutive failures scoped to one home. Generic route or combat failures do not establish that evidence.

## Validation

Focused tests cover interval and threshold boundaries, level-specific getters, missing observations, zero physical capacity, floor/ceiling, bounded history, current-capacity normalization, duplicate sampling, detached state, reloads, corrupt history, revision/clock fencing, and source versus room/workforce budgets. The full unit suite and production quality gates are recorded with the Jira increment. No native case was added or run for these dormant modules.
