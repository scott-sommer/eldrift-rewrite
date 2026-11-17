# Scouting and room intelligence (ED-28)

Status: source audit, reusable room graph, rich intel state and native plain-data capture are qualified in tested increments. Automatic scout/observer orchestration is not registered yet; no ED-28 acceptance criterion is complete.

## Source responsibilities and reuse

role.scout.js78–80 writes both expansion/remote summaries; its751lines also select objectives, stabilize after entry, avoid hostiles, track temporary exclusions, detect stuck/oscillating movement, repair invalid next hops and fall back to assigned flags. These become small feature policies composed over existing movement/task/population boundaries, not another all-purpose role module.

expansion.manager.js223–251 summarizes controller/owner/reservation/status, sources/mineral, exits, threats and highway/keeper classification. Its254–368 graph gap code supplies the initial port below. Scout death penalties and exploration-depth selection remain separate policy. remote.manager.js reuses scouting and orders non-keeper targets first; its assignment/scoring belongs ED-29. utilV2.js1089onward performs observer round-robin and power-bank discovery. ED-28 owns observation scheduling/visibility; ED-35 consumes discovery facts rather than controlling the observer directly.

Existing core/geometry/room-grid supplies validated world coordinates across W0/E0 and N0/S0. capabilities/movement/room-route supplies actual travel routing; it is not replaced by strategic spacing. The former persistence/intel v1 preserved IDs through visibility loss but lacked controller/resource/status/failure detail. It is now migrated under features/intel with the same intel/<room> namespace and owner; persistence supplies only the generic state machinery. Missing detailed observations remain unknown.

## Bounded pathable-room graph

capabilities/intel/room-graph snapshots injected cardinal exits per request, including unknown results, and filters blocked intermediates/destinations through an injected admission policy. It adds a diagonal strategic neighbor only when at least one real permitted origin→orthogonal→diagonal path exists. The edge retains its via witness. No Game/Memory or feature imports occur here.

room-gap runs bounded breadth-first search. It keeps the legacy strategic metric where that witnessed corner counts as one gap, while returning every real cardinal room hop in route evidence. This number is not physical room-crossing count, and diagonal edges are not direct movement commands. Actual creep movement remains the movement service's responsibility.

Depth/read caps and admission are explicit; a read cap counts unique exit-map reads, including orthogonal corner witnesses and unknown reads. Unknown graph, depth/read exhaustion, admission refusal, blocked destination and proven unreachable have distinct outcomes. A found route after incomplete exploration is explicitly exact=false: it is an upper bound, not a certified minimum. Caller policy must not promote incomplete results to safe reachability or shortest-distance claims.

There is no symmetric result cache. Directed/excluded/changed graphs are recomputed on a new request. Inputs must be stable snapshots for the request; cached arrays are detached from caller mutation. Canonical world room names and cardinal exit topology are validated instead of silently accepting impossible jumps. Generic geometry does not decide hostility, stale-intel risk or room-status admission; future feature policy owns those decisions.

## Verification and remaining work

Graph+smoke9tests pass261ms. Fixtures cover cross-quadrant real corners, missing corners, blocked intermediates, directed reverse failure, a pathable detour gap4 versus geometric2, unknown data, exact read/admission boundaries, detached request snapshots and invalid topology/budgets. Full units1,095tests/318files pass11.34s; quality505production/457testfiles zero Lizard violations. This pure mechanism is not wired into native gameplay yet, so the prior clean179-case engine archive is not presented as validation of this new graph.

Still required: bounded capture/refresh orchestration, scout death/history and lifecycle state, automatic visibility handling without unseen clearing, traversal policy from freshness/status/threats, bounded exploration/observation demand, scout lifecycle and shared movement recovery, observer action ownership and delayed visibility, death/owner-change/expiry scenarios and native end-to-end proof. ED-29/30 consume current intel through read models; ED-35 receives discoveries; ED-39 owns operator adapters and ED-44 legacy state translation. The feature remains In Progress.


## Version2 room intel state

The feature owns model, room-bound schema, validators, classification, freshness and store operations. Version1 migration preserves existing facts/extra fields, deduplicates ID indexes and initializes summary/physical visit/failure metadata to null. It does not infer a controller, resources, visit or observation cause from an old owned flag. Future/corrupt envelopes still reject without replacing the saved data.

Plain detailed summaries record room/tick, controller identity/position/level/ownership/reservation, API room status and its separate wall-clock timestamp, source capacities, mineral type/position, structures and unit identities/positions/owners (including power creeps), cardinal exits and derived sector flags. Duplicate object IDs, impossible exits, false classification, contradictory controller relations, owned-hostile structures and room/key mismatches reject. Controller is represented separately from the structures list. Hostile IDs are raw non-owned-unit/hostile-structure indexes, not a diplomacy decision; consumers retain owner identities for policy filtering.

Keeper retains the legacy raw4..6 room-number sector convention including the center room; center is also explicit. W/N normalized coordinates are converted back to room-number components before modulo classification, preserving W4N4/W5N5 behavior rather than shifting the sector by one.

lastSeen tracks the latest ID observation; summary.observedAt separately dates detailed facts. A newer ID-only compatibility observation preserves older details but makes detailed freshness stale even if their age is within the configured window. read reports visible/age/summaryAge and unknown/fresh/stale; visibility here means observed at that tick, not independent proof of current Game.rooms access. Detailed expiry is strict after maximumAge (default5000); maximumAge0 admits only the observation tick. Clock rewind/future queries reject rather than clamping a future fact's age to zero.

observeSummary atomically derives matching ID/ownership indexes. Only explicit visited=true advances physical lastVisit; observer capture must leave it false. recordFailure independently updates the latest context with stable-ID replay protection and ignores distinct older/equal-tick events. This is not a complete death/event history or a repeated-death counter; those remain scout lifecycle work. Snapshot absence never clears stored facts, and read/reconstruction do not alter unrelated namespaces. Rich observations and returned data are detached through existing persistence validation.

Migration/retention/freshness/snapshot tests plus smoke21tests pass256ms. Full units1,108tests/320files pass10.07s; quality510production/460testfiles zero Lizard violations, including type/lint/boundaries. The first quality pass found oversized decision counts in summary/read validation; header/optional-fact validation and freshness read models were extracted before the passing run. Existing Memory/intel tests and size fixtures now import the feature-owned state; generic persistence no longer imports a domain feature. Those are contract/persistence proofs; the later native capture qualification below supplies separate engine evidence.


### Opaque v1 ID compatibility qualification

A follow-up migration audit found that v1 ID indexes allowed arbitrary nonempty strings and duplicate-heavy arrays within the existing plain-data validation budget. Version2 preserves that opaque compatibility instead of retroactively applying rich-object ID/collection restrictions. Migration and the ID-only compatibility write normalize duplicate indexes. Rich summaries still enforce bounded object counts, short fact identifiers, valid geometry, ownership relationships and exact indexes.

The regression migrates12000duplicate opaque IDs, including an identifier longer than the rich-object limit, without inventing detailed knowledge. It also checks a repeated ID-only update. Invalid ID-only input now validates before opening/writing state. Full units1,109tests/320files pass8.73s; quality510production/460testfiles zero violations. Legacy retention tests now live in test/features/intel-retention.test.ts alongside the feature owner. Native observation/scout/observer evidence remains pending.


## Native plain-data capture and visibility qualification

app/native-intel-observation maps the current Game.rooms entry to detached model facts. Hidden rooms return undefined before map/room queries; API failures propagate instead of becoming empty/normal snapshots. Controller is mapped separately, preventing duplicate controller/structure IDs. Reservations, raw hostility, owner identities, power-unit classification, resource positions/capacities and current map exits/status remain observation facts. Diplomacy and traversal admission stay feature policy.

The new --intel-observation scenario runs production main plus an explicit capture probe for12ticks. It begins with an owned RCL3 room and a visiting MOVE unit; fixtures replace controller ownership with a reservation at3, remove the only visibility provider at5, reset the whole module at7, restore neutral-room vision at8 and restore owned RCL1 at10. During actual Game.rooms absence5–7, lastSeen/lastVisit remain4 and both source facts/mineral persist. With maximumAge2, freshness is fresh/fresh/stale; capture resumes with authoritative reservation/ownership changes on restored vision. Final snapshot contains two3000capacity sources, H mineral, neutral road, owned visitor/controller and the west W0N1 exit. Physical-visit marking is explicit in the probe; no autonomous scout traversal is claimed.

A planning namespace is initialized once at revision17 and serialized as a one-time witness. It remains byte-for-byte unchanged across ownership/vision/reset phases, while home-room intel continues updating every tick. The witness is not recreated after loss. This exercises actual native Memory/state isolation, not only an external sentinel that could conceal reinitialization. The fixture removes/re-adds a visibility unit directly; it is not scout population, observed death classification or replacement evidence.

Final native capture and existing --reload regression pass with no errors/messages. docs/evidence/intel-observation-native.json retains rows, reset witnesses, final rich record, unrelated plan and exact dirty/bundle/engine provenance. Foreign/raw hostility, allied identities, power-unit shape and non-normal map-status mapping are currently unit evidence; the native fixture does not contain a hostile encounter or an observer structure/action. The two clocks of statusTimestamp and observedAt remain distinct.

Quality511production/462testfiles passes with zero violations; full units1,111tests/321files pass8.32s. Focused native-capture/state+smoke10tests pass221ms. The capture probe is registered, bringing the full native suite to180cases; no new full aggregate has been run. The last clean179-case archive remains worker/construction evidence and predates this capture increment. Sampled whole-fixture CPU/Memory peaks are retained for provenance, not claimed as ED-43 performance/soak qualification.

Next: bounded/configurable automatic capture and refresh, ownership/freshness-aware traversal, scout demand/lifecycle/evade and delayed observer visibility with single action ownership. ED-28 remains In Progress.
