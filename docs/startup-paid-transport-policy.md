# Concrete paid transport policy and settlement ordering

ED-29 admission/policy source: `4e4f254c9a6831551abe43e7583d8b5dd1bd4be8`. Final runtime source includes shared fleet settlement at `765b803`.

## Reused protocol

`app/remotes/transport-admission.ts` builds the same collection candidate for native transport and private forecasting. Request IDs, actor/demand owner identity, service tiles, outstanding capacity and lifetime are preserved. Request expiry is the lesser of the current lease expiry and trip lifetime; an expired demand does not inspect stock or invent renewal. The existing quantity/task owners still reserve and clip the actual load before assignment. This extraction changes no native admission strategy.

The coherent home packet now includes the actual current mining demand: assignment/demand identity, generation, room/source/home and expiry. Read-only capture checks the current owner and generation. A captured token is a fact about that frame, not permission to keep renewing it.

`hauling-state/policy` supplies concrete productive recruitment, source staging, unseen-source preparation, current request authority and physical capacity checks. It binds detached source/worker metadata, requires an explicit current authority provider, and uses the shared admission builder. The physical composition fixture now uses this production policy rather than a handwritten recruiter. Authority expiry, generation change, unbounded expiry or lifecycle departure invalidates productive forecasting; cleanup remains a required separate controller. An explicit renewed lease does not extend an already issued request's deadline.

## Before-work settlement

Native remote actors already settled all prior transfer liabilities before optional actor work. `app/settle-hauling-fleet.ts` now owns that portable routine; both native and forecast service call it. Omitted productive visits still confirm/acknowledge prior effects in the one-frame event window and retain their unfinished tasks. This is a settlement phase, not an implicit productive visit.

## Evidence

- Policy/source/physical/context selection:22 tests/five files passed in412ms. Final settlement/service/physical/native-budget/admission selection:20 tests/five files passed in597ms. These selections overlap and are not a combined total.
- Final fixed smoke76 tests/15 files passed in454ms. Type checking, lint, architecture boundaries, Lizard (1155 production/958 test files, zero violations) and packaged bundle passed. Full units remain reserved for milestone/ticket closure.
- The physical fixture retains its32-energy settlement at105 and50-energy settlement at112 under the actual productive policy. It verifies explicit renewal, unchanged request deadlines and authority failure. A separate unvisited-courier case confirms50 without productive work, preserves the task, and resumes later without losing the event window.
- `engine-SmrAFr`: supported1000 native scenario passed on clean published admission source. Tick150..155 source demand generation31 is preserved while lease expiry advances349..354. Existing request deadlines remain345/351 across subsequent renewals. This is evidence that current lease facts and issued request deadlines are distinct.
- `engine-bbzW3w`: supported1000 native scenario passed on clean published final settlement source. Existing exact settlement-calendar, activated productive-route and coherent home/task/journal/claim assertions remained enabled. No private complete forecast was installed as a native financial calendar.

Raw evidence and exact-source hashes: `evidence/startup-paid-transport-policy.json` and its two compressed archives.

## Concrete world work still required

The initial composition now exists in [the private home hauling world](startup-home-hauling-world.md), including explicit source visibility, room/tile legality, current authority observations and actor ordering. Complete the remaining controllers and native qualification described there. A private authority controller must derive fresh demands from its modelled current lease state; repeatedly resolving the original expired token is not renewal. Actor cursor/control state and household/miner commitments must be seeded coherently when their controllers are added.

Keep the native order: observe current physical openings, settle fleet liabilities before optional work, execute the modelled actor sequence and then flush physical intents. Preserve source attribution and opening receipt baselines. Add private-world checkpoint/resume, mining/maintenance, births and cleanup/retirement/alternate sinks before full native future-calendar use.

Before joining the home financial timeline, reconcile accounting and material ownership explicitly. `StartupSpawnTimeline.finish` already calls `funding.receive` for accepted receipts; `StartupHousehold.finish` also updates its endpoint counters, and `transferHousehold` can deposit into the per-structure energy ledger. Do not replay a physical delivery as an additional passive flow or repeat a deposit during resume. Select one authoritative per-structure material owner and reconcile the accounting view once, preserving the qualified timeline's frame ordering until native calibration proves any replacement.

Multi-source exact future receipts, full horizon, strict5ms operation and the remaining ED-29 gates remain open. No financial admission or deployment was enabled.
