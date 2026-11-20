# Bulk boost-lab allocation (ED-36)

The lab console API now composes the portable per-room geometry allocator with an atomic operator-configuration transaction. It accepts at most 50 distinct room names. Room order is deterministic. No new configuration keys or state versions are introduced.

```js
var labs = require('main').industry.labs;
var buffers = [{resource: 'XGH2O', mineral: 60, energy: 40}];
labs.previewBoostRolesForRooms(['W0N1', 'W1N1'], buffers);
labs.assignBoostRolesForRooms(['W0N1', 'W1N1'], buffers);
labs.previewAllBoostRoles(buffers);
labs.assignAllBoostRoles(buffers);
```

The all-room helpers select visible owned rooms at controller level 6 or higher, using actual ownership rather than a username constant. A selected room with insufficient compatible labs refuses the whole operation. The preview includes each room's result, allowing the operator to choose a narrower explicit scope. There is no implicit best-effort partial application.

All-room enumeration is bounded by the same 50-room transaction limit. Larger empires must select explicit bounded scopes; atomicity applies within each call. Empty scopes make no configuration write. An empty buffer request clears selected rooms' desired roles, following existing retirement rules.

`configureMany([{home, input}, ...])` also supports explicit per-room lab patches. All ownership, patch/catalog/lab checks and the complete resulting configuration validate before one durable write. Existing profiles, environment settings, unrelated room settings and other rooms survive. Reapplying identical intent returns `changed:false`; the receipt lists sorted homes. Future schema state refuses.

Atomicity covers desired configuration. Existing admitted cargo, actor pins and lab bindings still settle under their owning controllers. Effects across rooms need not happen in the same tick. Higher-priority temporary settings can mask an override. Preview and apply are separate calls; apply recomputes rather than trusting a stale plan.

## Current qualification and remaining work

Qualified source is `b21ac9d463e73cb4690d19d656a060167ea5b71d` (implementation `71cf250`). Local type/lint/boundary and pinned Lizard 1.22.2 pass: 887 production / 735 test files, zero violations. Full unit suite passes 1,943 cases / 478 files in 18.52 seconds while the native batch was running; the preceding implementation check took 12.88 seconds. Smoke passes one case in 0.167 seconds, processor comparisons four in 0.196 seconds, report validation one in 0.1250208 seconds, and the bundle validates twelve lab commands. Exact-source [CI 44831475428](https://github.com/scott-sommer/eldrift-rewrite/actions/runs/44831475428) passes Windows and Linux with all six required steps.

Eleven clean native cases pass: bulk success/refusal, automatic per-room allocation, in-flight role switch/removal, lab operator, lab chain, boost operator, worker boost, Upgrade Room and packaged smoke. Both new cases run 320 ticks and module reloads at 8, 12, 31 and 181. The success case uses two owned RCL7 rooms, each with four labs, ordinary hauling and OH production. Both buffers settle at 60 XGH2O / 40 energy, retain 60 XGH2O in storage, recover 10 incompatible K and bank 10 OH. Buffer labs remain excluded from reaction assignments throughout. Final cargo, courier tasks and live quantity claims are empty. No actor boost is requested in these bulk cases; actor consumption is covered by the requalified existing automatic/worker cases.

The refusal case gives the second room only three labs. Preserving its reaction network makes the buffer infeasible. The all-room operation and reversed explicit-scope replay leave configuration bytes unchanged in both rooms and create no role namespace; both rooms still bank 10 OH. Successful preview and replay likewise make no extra configuration write. Unit tests additionally cover whole-patch validation, detached nested edits, JSON reset, stable room selection and RCL/ownership filtering.

The first clean native attempt at `24ea024` failed before any ticks because its room-copy fixture retained database identity metadata. That setup failure is preserved separately, not counted among the passes. The corrected fixture strips identities from detached copies. The [manifest](evidence/bulk-lab-allocation.json) retains source/raw/row hashes, reload provenance, per-room plans and terminal observations, the failed setup and full hosted CI steps. Trace integrity verifies 332 archives across project history, including failures; that count is not a scenario pass count. Registry 272 has not been fully rerun.

These are bounded two-room checks, not soak or general CPU/memory qualification. Test Memory deliberately accumulates per-tick observations; its growth cannot establish production memory behavior. Native death/visibility and cross-version rollback extensions remain open. No schema changes were made; rollback follows the existing configured-role quiescence procedure before loading older code.

Legacy global aliases and transient cache-clearing helpers still need explicit dispositions. Specialist producers, optimized body selection, empire production/resource allocation, lifecycle pressure/soak and migration/release gates remain open. This API restores bounded bulk role-selection capability without claiming complete legacy lab parity.
