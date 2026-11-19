# Automatic remote construction workforce

Clean implementation 672077c passes all 216 native engine checks in 1306.38 seconds. Ordinary main composition registers construction recruitment, actor service and task definitions. The feature is configurable and defaults off. This qualifies automatic workers for current typed outpost leases; it does not establish whole ED-29 or RC parity.

## Controls

`remoteConstructionWorkersEnabled` defaults false. It also requires remote management/workers, desired construction and a positive remote/workforce limit. `remoteSpawningEnabled` independently permits new construction spawns. Existing admitted service can continue with spawning disabled; disabling construction service withdraws work and returns cargo.

`remoteConstructionMaximumWorkers` defaults 2 (0..20), `remoteConstructionBodyBudget` defaults 300 (0..3000), and `remoteConstructionEnergyReserve` defaults 50000 (0..1000000). The body repeats WORK/CARRY/CARRY/MOVE/MOVE within budget and 50 parts; less than 300 produces no body. Construction uses the existing worker CPU budget, per-room configuration and existing road/container switches.

## Responsibility boundaries

- Infrastructure planning/site placement, candidate observation, body/travel quote, capital allocation, recruitment, final dispatch admission and actor service remain separate modules under app/remotes/infrastructure and features/remotes/infrastructure.
- Current lease generation owns each builder population scope. Selection and execution share live assignment/corridor/plan/site authority. Only owned, ready, incomplete sites at exact current-plan coordinates/types can become work. Unseen or stale authority is not an assumed empty/safe room.
- Loaded route timing uses full CARRY, planned route prefixes, actual/retained roads, terrain and obstacles. Unknown/blocked/incomplete routes and infeasible service produce no quote. Shared service timing controls recruitment lead and retirement reserve. Damage invalidates the full-body quote.
- Home-wide allocation reserves each selected room's remaining unboosted work once, credits carried construction supply and prioritizes existing work. Storage above reserve funds work; native spawn energy pays for additions. Site progress and birth costs remain separate from remote income.
- Queue/spawning cancellation is construction-owner scoped. Final dispatch rechecks configuration, generation, body, eligible work, funding and workforce capacity. Shared persistent same-tick workforce admissions prevent source/construction spawns from exceeding physical total and builder ceilings before Game.creeps updates. Failed/uncertain native effects retain their admission until the next tick, consistent with shared intent admission.
- Active workers use the existing task runner, quantity-booked home collection, shared work/action arbitration and movement. Finished or withdrawn work uses shared cargo banking and safe retirement. Transfer liabilities precede optional actor CPU work. Unrelated tasks/queues retain their ownership.

## Qualification

The clean main-loop --remote-road-auto fixture starts with no builder, a typed outpost lease and a passive remote witness. Main recruitment spawns one 300-energy worker at tick 2. A remote road away from the source station completes at 290. Withdrawal at 298 occurs in the remote room with 100 cargo; confirmed home refund follows at 305. Final construction stock is 1800 plus four roads costing 1200, matching initial 3000 storage. Spawn stock is 1000 after the 300 birth, matching initial 1300 spawn/extension energy. No mid-run funding or lifetimes are injected. Final cargo, tasks and quantity claims are empty; unrelated queue/state and three reloads are checked.

The --remote-road-admission fixture runs underfunded-above-reserve, disabled-worker and unaffordable-body stages. All 160 ticks retain 3000 storage and 1300 spawn energy, with no builder/request/progress. Final-dispatch tests separately reject stale generation, body changes, incomplete planning and exhausted capacity. Shared workforce tests cover same-tick/reload slot accounting across both worker families.

Full units: 1407 tests / 383 files / 9.90s. Type/lint/boundaries/bundle and Lizard pass (675 production / 557 test files, zero violations). The complete 216-case native suite includes previous worker, layout, logistics, remote lifetime, reservation actuator, migration and intentional failure-sentinel checks. Evidence: evidence/remote-construction-engine-suite.json and evidence/remote-construction-native.json, with exact automatic/admission/five-millisecond fleet trace archives. Probe samples do not establish ED-43 aggregate pressure or soak acceptance.

## Remaining gates

Combined scouting/discovery/source-selection/miner/courier/builder operation still needs its pipeline scenario; the construction fixture supplies the lease and witness. Threat/vision loss, natural builder replacement, alternate-home recovery, contention and broader funding/payback remain open. Topology replanning may leave non-current sites; service excludes them, but route stability/stale-site cleanup needs assessment. Automatic reservation, adaptive capacity/reachability, specialist/operator paths and whole-release migration/rollback remain separate backlog obligations.
