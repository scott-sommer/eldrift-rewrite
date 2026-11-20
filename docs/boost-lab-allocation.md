# Automatic boost-lab allocation

ED-36 source `3262367` adds a portable geometry planner and two operations to the shipped lab API. It restores the legacy nearest-spawn selection intent from `labV2.getOutputBoostLabs` while refusing an allocation that would leave enabled reactions without a valid network. It uses the existing configured role/preload/retirement controllers; it does not rewrite live assignments or repeatedly reallocate labs every tick.

```js
var labs = require('main').industry.labs;
var buffers = [{ resource: 'XGH2O', mineral: 60, energy: 40 }];
labs.previewBoostRoles('W0N1', buffers); // no configuration write
labs.assignBoostRoles('W0N1', buffers);  // recomputes, then applies a feasible role policy
```

Requests contain only `resource`, `mineral` and `energy`; use ordinary `configure` for explicit fixed lab IDs. Bounds and native boost-compound validation match existing role configuration. At most ten buffers are accepted. Request order assigns earlier effects to nearer selected labs. Manual `labReservedIds` and inactive labs are excluded from automatic allocation. Native composition anchors to the first owned room spawn sorted by name; the portable planner accepts an explicit anchor for other policies.

By default, `preserveReactions` follows the room's effective `labReactionsEnabled`. With it enabled, allocation must leave two inputs and at least one geometrically reachable output. An explicit `{ preserveReactions: false }` permits role-only allocation and can consume all eligible labs even if the configured reaction flag is enabled. Clearing with an empty request list remains possible without a spawn or viable reaction network; its empty input/output projection is not a claim about remaining reaction capacity.

## Bounded mechanism

The planner considers at most 45 unordered input pairs for ten labs. For each pair it identifies compatible output positions, allocates spare/outlying labs before consuming output capacity, then selects nearer output slots as needed. It ranks proposals by remaining reaction output count, total Chebyshev range to the spawn anchor and deterministic lab/input IDs. Selected labs are finally ordered by range for request association. The search is stock-independent and does not mutate inputs.

This deliberately improves the old all-labs-within-two input assumption: unrelated boost/outlier labs need not invalidate a valid reaction cluster. Unit tests compare the pair-based planner with an independent exhaustive role-subset oracle on mixed geometry and verify stable results under roster permutations. This is not terrain/path-cost optimization or a guarantee of immediate stock availability.

A successful preview returns roles, one viable geometric input/output projection, distance score and the chosen preservation policy. The ordinary reaction controller remains responsible for actual inputs/outputs and may choose a different stock-aware network. Existing bindings, admitted hauling and actor pins may delay the new steady-state geometry until their normal handoff completes.

An infeasible request returns `ok:false`/`insufficient-compatible-labs`, with no partial assignment. Missing spawn returns `spawn-unavailable` for nonempty requests. Unowned/unseen rooms, malformed input/options and unsupported compounds refuse explicitly. Preview is read-only. Applying recomputes current geometry, then routes the whole feasible role list through validated `configure`; repeated application of the same result makes no extra configuration write. An active higher-priority temporary role policy can still mask the persistent override, visible in the returned configuration provenance.

The operation replaces the room's desired role list; it does not silently retain fixed roles omitted by the new request. Use explicit configuration to retain fixed assignments. No structure is destroyed, and no task, claim, journal or admitted effect is cleared to make a plan fit.

## Qualification

Final local full units pass 1,935 cases / 475 files in 14.50 s; focused + smoke 13 / 4 files in 0.254 s. Type/lint/boundary checks and pinned Lizard 1.22.2 pass with 884 production / 729 test files and zero violations. Processor comparisons pass 4 in 0.221 s, suite-report check 1 in 0.1395168 s, and bundle checks validate seven exported lab commands. Exact-source [CI 44823727896](https://github.com/scott-sommer/eldrift-rewrite/actions/runs/44823727896) passes Windows/Linux and all six required checks.

Eleven clean native cases pass in 92.187 s: new automatic allocation and infeasible refusal, explicit role preload, in-flight role switch/removal, lab operator policy, lab chain, boost operator, worker boost, Upgrade Room and packaged smoke. Each role case runs 320 ticks with module reloads at 8, 12, 31 and 181.

In the feasible four-lab room, automatic allocation selects the nearby lab at range 5 and leaves a two-input/one-output projection. Preview and repeated apply leave configuration unchanged except the initial intended assignment. Ordinary hauling preloads it; two actual XGH2O WORK parts confirm at tick 44, the role refills to 60 mineral/40 energy, and ordinary reactions bank 10 OH. Final courier/tasks/live claims are empty.

The refusal case requests two boost buffers from the same four-lab room while preserving reactions. It creates neither a role configuration change nor an industry role namespace; no actor is boosted. Existing reactions still bank 10 OH and recover the incompatible K. Preview and repeated failed apply both preserve configuration bytes. Irregular layouts and explicit role-only tradeoffs have unit/oracle evidence rather than new native-layout qualification.

The [manifest](evidence/boost-lab-allocation.json) retains source/raw/row hashes, plans, no-write witnesses, reloads and complete CI step results. Registry 270 was not fully rerun. Broader room-layout, destruction/visibility, pressure, CPU/memory/soak and cross-version rollback requirements remain open.

## Remaining scope

No new schema or configuration key is introduced: the allocator writes existing `labBoostRoles` intent and keeps the prior role-namespace retirement rules. Pre-API rollback removes the two console methods; existing roles/hauling still require the documented quiescence and migration process in [configured boost roles](industry-boost-lab-roles.md).

This is per-room, explicit automatic assignment, not a continuously running empire policy. Bulk owned-room operations and legacy helper aliases (`setBoosts`, `setAllRoomBoosts`, `setAllBoosts`, cache-clearing controls), specialist producers, optimized boosted bodies, empire production/resource allocation and broader lifecycle/release qualification remain open. Full legacy lab/console parity is not claimed.
