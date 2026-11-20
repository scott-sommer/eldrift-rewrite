# Current native startup observations

ED-29 remains In Progress. `createNativeStartupFacts` is a read-only boundary for binding the forward project model to current game objects. It returns detached JSON-compatible observations at an explicit current tick, or defers without a partial result. It creates no assignment, spawn request, worker, task, claim or income. The existing current-birth capital gate shares the extracted home-stock calculation; its policy and accounting order are unchanged.

The snapshot identifies the exact planned station tile, actual source and one home bank endpoint. Construction progress, existing container energy/capacity/durability/decay phase, source stock/regeneration phase and endpoint capacity are observed independently. A different adjacent container does not complete the selected station. A missing site retains the actual native container construction cost. Owned home, visible safe unowned remote, matching source, legal station and current assignment exclusivity are checked. An unassigned candidate may be observed, but observations do not grant an execution lease.

Home capital excludes worker cargo, subtracts active stock claims and preserves spawn-accessible stock separately from bank stock. Existing room-cohort miners/couriers/reservers/builders retain body damage/boosts, cargo, position, spawning status and TTL in the snapshot; they are not silently imported as free future workers. Source-container stock and shared endpoint capacity retain existing logistics claims. Expired claims disappear from the read model without writes to the ledger. Available amounts are clamped at zero, not treated as new reservations. The injected structure availability view preserves same-tick structure commitments for callers that have them.

The workforce capture checks its caller guard and caps the cohort at128. Source lookup uses the native room source list rather than accepting arbitrary energy-bearing object IDs. Native source, store, construction and decay fields follow the [Screeps API](https://docs.screeps.com/api/); the observation tests are separate from the pinned processor comparisons.

## Remaining conversion and freshness work

The existing remote travel estimator ends within range of a source; that is not necessarily the planned station or selected bank endpoint. Exact station arrival, courier collection and each spawn-origin/deposit leg must be measured before converting these observations to forecast inputs. Spawn positions and actual remaining busy time are retained rather than replacing them with a fictional common origin. Existing infrastructure stock, active workers, reservation/production changes, overlapping handoffs and future policies also need explicit forward-model strategies. No current observation is itself a future receipt or feasibility certificate.

The snapshot is valid for its observation tick only. It is not cached as execution authority. Native revalidation at commit, input identity/invalidation, compact budgeted persistence/reset recovery, native forecast CPU qualification and whole-project candidate evaluation remain open. Ordinary remote selection does not yet call the portable forward simulator. This increment must not be presented as completing planner integration or remote parity.

## Qualification

Clean source14483a5 passes positive ordinary startup admission, protected refusal and packaged smoke serially:3 cases19.711s (10.041s/8.773s/0.893s). The150-tick positive case records source energy1116/capacity1500/regeneration205, exact station progress376/5000, one actual miner with1392 TTL and8 cargo, spawn stock2300, bank endpoint7250 and total home stock9550. This independently identifies the real spawn and deposit positions. Global reloads21/81 and ordinary startup assertions pass. The native observation probe uses raw spawn availability on this quiescent frame; mocked checks separately cover injected same-tick commitments and quantity claims. No native forecast or selection integration is inferred.

Full units1,661/424 files11.55s; controlled processor comparisons4/194ms; suite-report contract1/136.318ms. Quality, bundle and pinned Lizard pass:780 production/629 test files, zero violations. All ten new observation cases pass. Exact source hashes, clean provenance, native observations and two150-row archives are retained in [evidence](evidence/remote-startup-native-facts.json). Registry234 is unchanged; the full234-case registry was not rerun.

Hosted [Quality run44664440814](https://github.com/scott-sommer/eldrift-rewrite/actions/runs/44664440814) passes Ubuntu24.04 and Windows2022 on the same native-qualified source14483a5, including all six quality/unit/processor/report/bundle steps.

## Exact travel follow-up

The later [fixed-service startup travel quote](remote-startup-travel.md) now measures exact selected spawn-exit, station, collection and deposit legs with durable guarded progress. It preserves fresh facts and excludes the permanent miner tile from courier paths. Operational strategy adoption and complete forecast-input conversion remain open.
