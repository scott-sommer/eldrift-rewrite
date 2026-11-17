# Scouting and room intelligence (ED-28)

Status: source audit and reusable room-graph mechanism started. No native scout/observer runtime is registered by this increment, and no ED-28 acceptance criterion is complete yet.

## Source responsibilities and reuse

role.scout.js78–80 writes both expansion/remote summaries; its751lines also select objectives, stabilize after entry, avoid hostiles, track temporary exclusions, detect stuck/oscillating movement, repair invalid next hops and fall back to assigned flags. These become small feature policies composed over existing movement/task/population boundaries, not another all-purpose role module.

expansion.manager.js223–251 summarizes controller/owner/reservation/status, sources/mineral, exits, threats and highway/keeper classification. Its254–368 graph gap code supplies the initial port below. Scout death penalties and exploration-depth selection remain separate policy. remote.manager.js reuses scouting and orders non-keeper targets first; its assignment/scoring belongs ED-29. utilV2.js1089onward performs observer round-robin and power-bank discovery. ED-28 owns observation scheduling/visibility; ED-35 consumes discovery facts rather than controlling the observer directly.

Existing core/geometry/room-grid supplies validated world coordinates across W0/E0 and N0/S0. capabilities/movement/room-route supplies actual travel routing; it is not replaced by strategic spacing. persistence/intel v1 already preserves IDs through visibility loss but lacks controller/resource/status/failure detail. The next state increment must extend/migrate that owned record, preserve old facts, and represent missing detailed observations as unknown rather than invent empty rooms.

## Bounded pathable-room graph

capabilities/intel/room-graph snapshots injected cardinal exits per request, including unknown results, and filters blocked intermediates/destinations through an injected admission policy. It adds a diagonal strategic neighbor only when at least one real permitted origin→orthogonal→diagonal path exists. The edge retains its via witness. No Game/Memory or feature imports occur here.

room-gap runs bounded breadth-first search. It keeps the legacy strategic metric where that witnessed corner counts as one gap, while returning every real cardinal room hop in route evidence. This number is not physical room-crossing count, and diagonal edges are not direct movement commands. Actual creep movement remains the movement service's responsibility.

Depth/read caps and admission are explicit; a read cap counts unique exit-map reads, including orthogonal corner witnesses and unknown reads. Unknown graph, depth/read exhaustion, admission refusal, blocked destination and proven unreachable have distinct outcomes. A found route after incomplete exploration is explicitly exact=false: it is an upper bound, not a certified minimum. Caller policy must not promote incomplete results to safe reachability or shortest-distance claims.

There is no symmetric result cache. Directed/excluded/changed graphs are recomputed on a new request. Inputs must be stable snapshots for the request; cached arrays are detached from caller mutation. Canonical world room names and cardinal exit topology are validated instead of silently accepting impossible jumps. Generic geometry does not decide hostility, stale-intel risk or room-status admission; future feature policy owns those decisions.

## Verification and remaining work

Graph+smoke9tests pass261ms. Fixtures cover cross-quadrant real corners, missing corners, blocked intermediates, directed reverse failure, a pathable detour gap4 versus geometric2, unknown data, exact read/admission boundaries, detached request snapshots and invalid topology/budgets. Full units1,095tests/318files pass11.34s; quality505production/457testfiles zero Lizard violations. This pure mechanism is not wired into native gameplay yet, so the prior clean179-case engine archive is not presented as validation of this new graph.

Still required: versioned rich summaries/freshness/visit/death/failure state, native capture without unseen clearing, traversal policy from freshness/status/threats, bounded exploration/observation demand, scout lifecycle and shared movement recovery, observer action ownership and delayed visibility, death/owner-change/expiry scenarios and native end-to-end proof. ED-29/30 consume current intel through read models; ED-35 receives discoveries; ED-39 owns operator adapters and ED-44 legacy state translation. The feature remains In Progress.
