# Pickup-bound household redistribution

ED-29's new portable transfer state machine closes the physical specification needed before integrating household work with project funding. It is not connected to the funding timeline or default bot yet. Existing dated funding refills remain unchanged. No new persistent namespace, project checkpoint format or runtime configuration is introduced by this increment.

Each of up to64 finite trips (at most16 worker request identities) names a pickup frame, loaded travel, return travel and maximum energy. The injected worker port must supply authoritative modeled paid-birth facts: actual first-active frame, remaining-life expiry and CARRY capacity. Missing/not-yet-ready/expired bodies do no work. This port does not charge a body itself; integration must bind it to the existing admitted/charged spawn timeline, never invent a zero-cost worker.

Withdrawal takes only the amount physically available at the pickup. That exact cargo is retained through loaded travel. Later source income cannot retroactively fill an empty earlier trip. Destination acceptance may be partial or blocked; remaining cargo retains exclusive use of the same worker. After an actual full deposit, the recorded return leg prevents immediate reuse. A separate trip cannot borrow a carrying worker. A pickup with no stock is abandoned at that frame; no later energy is silently attached to it.

Known finite-life expiry reports only still-held cargo through the injected loss port. Last-alive-frame deposit is permitted; arrival at the first absent frame is not. This is modeled unreturned energy with no invented future salvage, not proof of actual native destruction. The actual lifecycle/recovery owners must distinguish observed loss, retained remains and confirmed recovery. A horizon ending in flight retains cargo and grants no deposit credit. Visibility loss does not infer early death here; integration supplies authoritative modeled birth/lifetime facts.

The component owns physical transfer state only. Withdrawal/deposit/loss ports retain actual pool/finance ownership. Withdrawal and deposit must return their exact accepted amount within requested bounds. Internal transfer must not create household cash. Invalid port effects throw; there is no promise of rolling back an invalid external port's side effects. The caller must run the transfer phase after birth admission so deposited energy cannot fund an earlier action in the same frame.

A detached format1 checkpoint binds canonical trip semantics, keeps cargo and busy clocks, and rejects changed input, incompatible format, conservation violations, erased return travel and impossible phase clocks. JSON property order is immaterial; trip order remains explicit policy priority. This is a portable wire contract, not a completed migration of the existing project/planning checkpoints.

## Next integration work

1. Add an explicit physical endpoint pool and in-transit quantities to project funding; keep inaccessible bank assets separate from spawn-accessible energy.
2. Bind worker availability/capacity to actual modeled admitted births and charge them once through the existing allocator. Import paid incumbent household workers with explicit facts/templates rather than new zero-cost births.
3. Make pickup reserve only current unclaimed endpoint stock; credit future remote receipts only when settled. Unspecified outside income cannot become reachable endpoint stock automatically. Prevent overlap with legacy declared refill ownership.
4. Release actual accepting-endpoint capacity after withdrawal for the following frame. Deposit may enable only subsequent-frame spawn admission. Retain blocked cargo and return clocks.
5. Account loaded-expiry disposition once in physical state and household/source financial ledgers; preserve pending native receipt/recovery ownership independently.
6. Introduce and validate the required project checkpoint/planning schema version changes, with read-only migration of genuine old inputs and fail-closed incompatible/forward state. Rehearse the boundary under ED-44.
7. Generate finite household trips from quoted geometry and complete paid workforces, then qualify funding, bounded replay/reset, actual native lifecycle/cashflow, aggregate pressure and default configuration/adoption.

These are remaining ED-29 requirements. The component's tests do not establish complete household funding, native operational profitability or RC readiness.

## Incremental checks

`npx vitest run test/capabilities/remote-startup-redistribution.test.ts test/capabilities/remote-startup-project.test.ts test/features/remote-startup-schedules.test.ts`:32cases/3files0.747s, including11 new physical transfer/checkpoint behaviors. `npm test`:76smoke/15files0.460s. Typecheck/lint/boundaries and pinned Lizard pass,926production/788testfiles, zero violations after separating input validation, checkpoint/occupancy validation and phase rules. `npm run check:bundle` passes. No full-unit/full-native-registry or new native scenario was run for this unintegrated portable increment. Full units remain a milestone/ticket-closing gate.
