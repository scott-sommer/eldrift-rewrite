# ED-18 acceptance audit

Scope: reusable ordinary movement foundation, not completed gameplay or empire performance certification. Audited 2026-11-14 against the Jira description.

| Criterion | Implementation and executed evidence |
| --- | --- |
| Explicit path outcomes and bounded reconstructible cache | path-model.ts, path-key.ts, path-service.ts; path-service.test.ts covers distinct complete/incomplete/no-route behavior, all key dimensions, capacity, expiry, invalidation, copy isolation and reset. Native search preserves room-aware endpoint checks. |
| Coordinate boundaries and room identity | room-grid and movement-transition unit tests; exits/navigation engine scenarios cross W0/E0 and N0/S0 in all four directions and verify arrival. No prototype overrides. |
| Exclusion, fatigue, damage, vision, blockers, resets | room-route tests cover hostile exclusions and budget failure; mobility tests cover damaged MOVE, load and boosts; matrix-snapshots tests cover visibility loss/recovery and version change. Unseen engine scenario gains vision; service-recovery proves loaded fatigue, immobility, denial-driven detour and service reconstruction. Path cache reset is unit-tested; full runtime reload is separately engine-tested. |
| Single authority and formation extension | movement-service composes one dispatcher, explicit injectable action arbiter, owner and priority. Traffic tests prove chains, swaps, deterministic contention and group rejection propagation. Traffic and occupied-exit engine scenarios prove swap/contention and remote landing suppression. group is coordinated admission, not a claim of engine-atomic multi-creep moves. |
| Keep/adapt/adopt decision | movement.md retains native search/traffic, corrects legacy range/incomplete assumptions, and preserves legacy waypoint/portal policy for downstream mission/operator work. Cartographer not adopted or copied. License/dependency and comparative CPU validation are mandatory before any future adoption; no candidate performance or license-clearance claim. |
| Actual-engine arrival, recovery, invalidation | navigation, service-recovery and paths fixtures. Paths asserts search counts 1/1/2 after topology revision. All are bundled with production components and run on pinned engine 4.3.2/driver 5.3.0. |

The current service is usable by subsequent features via move(creep, command), followed by flush in createGameLoop's afterTick hook. Main currently registers no gameplay features, so it does not instantiate an unused movement service. Each future composition must inject the shared arbiter and retain one dispatcher.

Limitations retained for subsequent work: no empire CPU/soak certification (ED-43), no full formation policy (ED-34), no waypoint/portal mission or operator parity yet (ED-33/39), and no production deployment. Unseen terrain routing cannot infer invisible occupants or safety; room exclusions remain caller policy. Cross-room simultaneous moving chains require expanded scenario coverage with downstream formations. The conservative solver does not shove idle creeps and may leave capacity unused when a selected winner is later pruned.
