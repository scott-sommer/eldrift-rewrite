# Enforcing a quoted birth origin

ED-29 remains In Progress. Spawn requests may now carry an optional `placement` containing one actual spawn ID and one exact exit tile in the production room. This is a constraint: the allocator cannot substitute another idle spawn. Requests without it retain ordinary room-wide allocation. `bindStartupBirth` binds a startup travel plan only when its ordered body and physical production room match, preserves request identity/owner, rejects incompatible existing placement and detaches nested geometry. It does not grant assignment authority or bypass final funding checks.

The forward spawn timeline uses the same allocator and snapshots the nested constraint. A busy selected spawn postpones the request despite other idle spawns. Sponsor population home remains independent from the physical production room.

## Native enforcement

The native adapter checks the selected ID and exact adjacency against current spawn coordinates, then supplies exactly one native spawn direction. Static preflight covers terrain, blocking structures/sites, natural objects and controller positions, including native road-on-wall and public-rampart walkability. It happens before the shared structure/energy admission. Invalid or vanished geometry cannot consume admission or silently relocate a birth. Unbound calls preserve the existing native option shape and injected population memory.

The pinned engine4.3.2 `game/structures.js`, `processor/intents/spawns/create-creep.js` and `_born-creep.js` establish direction handling. The selected direction persists during incubation. A future occupied exit can still delay completion; the engine need not choose another exit when only one direction is supplied. Static admission does not guarantee a future ready date, and an operational project must reobserve actual readiness and handle blocked exits. No unit relocation or cancellation policy is invented here.

## Queue wire contract

`spawning/<room>` advances from schema1 to schema2, owner `population`. Migration validates and preserves old pending requests and unrelated data; it refuses legacy payloads already containing an unsupported placement rather than silently reinterpreting them. Schema2 validates the optional placement on every read/save. Older schema1 readers reject the future version, so rollback cannot quietly ignore selected-origin constraints. The independent `spawning/dispatch` envelope remains schema1.

The migration is forward compatibility work, not a complete ED-44 rollback rehearsal. A rollback procedure must explicitly reconcile/cancel bound requests under their owners before any down-conversion; it must not merely relabel a version2 envelope as version1.

## Remaining integration

This increment enforces birth placement for requests that carry it. Ordinary remote recruitment does not yet publish selected forward-project plans. Enforcing collection/deposit service geometry, handling blocked or damaged/aged cohorts, complete schedule conversion, persistent forward simulation and economic candidate policy remain open, along with wider native pressure/parity gates.
