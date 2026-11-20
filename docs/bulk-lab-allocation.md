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

Local type/lint/boundary, pinned Lizard, full unit and bundle checks are recorded in the ED-36 update for this source milestone. The tests cover all-or-nothing patch validation, detached nested edits, replay after JSON reset, stable room selection, ownership/RCL selection and refusal before configuration invocation.

Two-room packaged native success/refusal scenarios, exact-source Windows/Linux CI and archived runtime evidence remain required before claiming native bulk qualification. Prior per-room native evidence belongs to its recorded source revision and is not evidence for this change. The existing 270-case registry has not been fully rerun for bulk controls.

Next validation should use two owned RCL7 rooms, ordinary hauling and OH production with XGH2O buffers; preview must preserve configuration bytes, successful apply must persist both rooms through module reloads, replay must make no extra write, and one infeasible room must leave both policies unchanged. Check buffer/reaction separation and final tasks/cargo/live claims rather than configuration acceptance alone.

Legacy global aliases and transient cache-clearing helpers still need explicit dispositions. Specialist producers, optimized body selection, empire production/resource allocation, lifecycle pressure/soak and migration/release gates remain open. This API restores bounded bulk role-selection capability without claiming complete legacy lab parity.
