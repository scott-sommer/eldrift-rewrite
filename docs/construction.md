# Desired-state construction reconciliation (ED-27)

ED-27 is In Progress. This feature consumes retained plans independently of layout search. It must not delete plan entries after a structure/site appears; retained desired state is needed to rebuild losses. No site execution or runtime registration is implemented yet.

## Legacy reference

Read-only Eldrift-Directive baseline f2bbf7e8c44addc7c426abb5458e393c9502ff5f, utilV2.js around3180-3232: skip built placements, count existing sites, wait for entry RCL/source-container policy and structure capacity, issue at most one site, stop on ERR_FULL, then replace Memory.build with leftovers. Road/container helpers around2605-2623 issue direct construction calls. These behaviors inform the new boundary; the destructive leftovers model will be replaced by retained desired state. No legacy source was copied in this increment.

## Implemented boundary

features/construction/model.ts defines a snapshot port with room RCL, usable stored energy, terrain/fixed objects, observed structures/sites, completed dependency keys, temporary occupancy, RCL limits and independent global/room site budgets.

constructionEligibility is pure read-only classification: built, site-existing, eligible, waiting-for-RCL, waiting-for-budget, temporarily-blocked or invalid, each with an explicit reason. Existing owned objects are recognized before budget/stage checks. Static illegal terrain is invalid; obstruction/dependency states can be revisited. Energy reserve is compared against persisted minimumStoredEnergy at classification time. Structure/site counts deduplicate physical IDs. Shared placement rules are reused; native compatibility remains to be qualified.

Tests cover exact RCL/reserve boundaries, existing-object precedence under downgrade/exhaustion, invalid placements/metadata, occupancy/dependency waits, independent site caps and duplicate observations. Quality passed486production/437testfiles with zero Lizard violations. Focused classifier plus smoke:5tests in219ms. This is unit evidence, not native site creation or end-to-end reserve enforcement.

## Remaining work

1. Prepare/validate snapshots and index inventory once per cycle; avoid per-entry room scans at scale. Define usable reserve and neutral/hostile structure ownership explicitly.
2. Merge automatic/manual entries by stable placement key with manual precedence; order bootstrap, extraction/delivery, capacity, defense and later infrastructure. Preserve dependencies and remote policy.
3. Add a bounded executor with injected site port, in-cycle capacity reservations, current-state rechecks, explicit result mapping and retries/backoff. Do not issue destructive migration actions.
4. Register native configuration/observation adapters; retain all committed entries and bootstrap anchor across resets, RCL changes and structure loss. Enforce RCL plus reserve immediately before each site call.
5. Add actual-engine cases for existing sites, caps, RCL unlock/downgrade, reserve loss/missing storage, rebuilding and resets. Finalize ED-22 role reconciliation prerequisite before ED-27 acceptance closes.

The full rewrite remains active; this classifier does not satisfy the remaining construction acceptance criteria.
