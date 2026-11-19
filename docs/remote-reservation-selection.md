# Configurable reservation candidate selection

Implementation8300dca decorates ordinary native management candidates with priced reservation or explicit unreserved decisions. This document records the selection-only increment following the generation-owned authority foundation at585c4e4. Automatic population, funding and final admission follow at a376519; see remote-reservation-population.md.

## Controls

| Setting | Default | Purpose |
| --- | --- | --- |
| remoteReservationEnabled | false | Enable priced reservation candidate selection when remote management runs. |
| remoteReservationBodyBudget | 5200 | Balanced CLAIM/MOVE body ceiling, capped by actual home capacity; allowed0–5200. |
| remoteReservationMinimumBuffer | 100 | Requested missed-tick/handoff reserve buffer; allowed0–4999. |
| remoteReservationMargin | 25 | Replacement scheduling margin; allowed0–600. |
| remoteReservationQuoteRooms | 1 | Maximum candidate visits per management call; allowed0–64. |
| remoteReservationEnergyReserve | 50000 | Protect storage capital from new/replacement reservation births; quotation does not spend it. |

Existing remoteReassessInterval controls refresh cadence; intelMaximumAge bounds returned quote age. Existing route/path bounds constrain native measurement. These settings resolve through the shared empire/room/temporary configuration layers. Default-off selection reads no selection state or native quote context. Enabling this increment can publish Reserve leases, but automatic Reserve actors are not registered yet; this is not an operating recommendation to enable unattended reservation.

## State and policy stability

The remotes-owned remoteReservationPolicy/<home> schema1 record stores at most64 candidates, a round-robin cursor, bounded quotation results and the last complete published sweep. Identity includes candidate order, pricing, traversal and measurement bounds. Identity changes clear the previous published decision set; a CPU-refused new identity cannot return old-policy quotes. Revision/clock fencing, detached reads, quote recomputation and candidate/cursor validation protect persistence.

One bounded visit can price a room or preserve its deferred work. CPU refusal leaves its cursor pending and controller measurement retains completed travel legs. A deferred room with CPU still available yields its turn, so missing observations cannot starve other candidates. Infeasible/unknown rooms remain explicitly unreserved. Complete sweeps publish together. Equivalent refreshes keep quote timestamps until half the allowed age, then refresh conservatively; this prevents every visit from restarting source-management scans. Expired quotes are omitted even if quotation is paused. Current controller admission still rechecks cached prices before lease commitment.

This prices reservation against observed source production. It does not overwrite neutral source capacity with projected reserved production, refill source stock, or count one room's reserver once per source. Recruitment must still bind the selected price to the managed lease generation and actual controller, and all actors must recheck safety independently of scan publication.

## Verification

Full units:1442 tests /392 files /10.28s. Type/lint/boundaries/bundle pass; pinned Lizard698 production /570 test files, zero violations. Clean focused native --reservation-selection, --room-reservation and --remote-management pass at8300dca. Evidence and the exact32-tick selection trace are in evidence/reservation-selection-native.json.

The selection fixture supplies two candidate rooms and passive witnesses. A1299 body budget refuses reservation,1300 enables buffered quotes and Reserve leases, equivalent refreshes remain stable through reloads, disabling pauses selection state and removes reservation decisions, and re-enabling restores priced leases. Native reservation remains absent, spawn energy stays1300 and source capacity stays1500. Three reloads and unrelated state are preserved. No mid-run energy or lifetime injection is used.

The full registry now has219 cases; it was not rerun for this isolated selection increment. The clean218-case6bcfa0e suite remains the broad regression baseline. Natural buffer growth/replacement, resource-funded recruitment, pressure/soak, combined discovery/extraction/redistribution and economic startup/payback remain open ED-29/ED-43 work.

Automatic population follows at a376519 with finite birth funding, shared tasks, natural replacement and scoped recovery; see remote-reservation-population.md. Earlier statements that recruitment is unregistered describe the selection-only increment.
