# Exact hauling service geometry

ED-29 remains In Progress. Logistics requests may carry `service` geometry: exact collection/deposit tiles and an optional bounded exclusion list. Native hauling reads this from the authoritative pending request before each transfer. It uses the existing quantity reservations, task owner, route admission, action arbiter, movement service and confirmation journal. No parallel hauling loop or extra stock/position ledger is introduced.

## Execution contract

Being within transfer range of an endpoint is insufficient for a constrained request. The native adapter moves to the selected service tile with range0 and cannot issue withdraw/pickup/transfer or begin an intent journal until both the service position and ordinary endpoint range are satisfied. It rechecks adjacency against the actual endpoint and current static standability. A moved/mismatched endpoint fails; a blocked service tile waits without an intent. Temporary occupancy remains a traffic decision and can delay work. Existing unbound calls retain range1 behavior.

The same static standability helper now serves spawn exit preflight and transfer service positions. Explicit route exclusions reach the existing movement service, so a startup plan's permanently occupied miner station can be excluded just as it is in the quote. Exclusions are bounded to64 valid world positions and cannot include either required service tile.

`bindStartupHauling` matches an energy request to the quoted source/station/container and deposit endpoint, preserves request identity/owner and copies collection/deposit positions plus the station exclusion. It rejects incompatible existing service geometry. This binds geometry only, not current assignment authority, stock/capacity, actor/body selection or an economic commitment. Ordinary remote plan publication remains separate work.

## Persistence, immutable requests and rollback

`logistics-requests/<home>` advances from schema1 to schema2, owner `logistics`. Forward migration preserves requests, cancellation status and confirmed receipts, while rejecting previously unsupported legacy service metadata. Service comparison is structural; immutable request equality checks both sets of keys so adding a constraint to an existing unconstrained identity cannot be silently accepted and discarded. Removing/moving a constraint requires an explicit new request lifecycle under its owner.

Tasks retain their generic schema2 envelope. Their request payload is a snapshot; `runHauling` retrieves the authoritative pending logistics request before any new execution. It therefore uses current queue geometry even when an older task snapshot has none. Older schema1 logistics readers reject the future queue before that execution boundary. Existing in-flight settlement still belongs to the same journal/queue owners; the full ED-44 rollback rehearsal must cover those states. Do not relabel a service-bearing queue as schema1 or strip constraints while live tasks/claims/attempts remain.

## Scope

This is request-level execution enforcement. It does not yet publish selected remote forward plans, enforce a miner's own complete service strategy, generate future body/refill/reservation schedules, import live crews into the forward model, persist full forecast simulation or qualify aggregate pressure, alternate endpoints and economic candidate policy. Exact positions alone do not establish quoted throughput or eliminate traffic delays.
