# Mining port record

ED-20 in progress. Source reference: legacy role.minerV2.js at baseline f2bbf7e8c44addc7c426abb5458e393c9502ff5f. Legacy spawning/moving/mining/building states and remote reachability reporting remain required; direct role-owned movement will be replaced by the shared movement service.

MiningStation describes energy/mineral identity, resource position, adjacent access tiles, optional container/link/extractor IDs, throughput, availability, observation/ready times and risk. Validation enforces distinct same-room adjacent tiles. Station metadata is a contract, not yet a persisted observation implementation.

Feature-owned assignments reuse durable exclusive reservations keyed by physical room/tile, rather than station ID: adjacent sources cannot double-book the same standing tile. Claims use caller task scopes so existing task cancellation/death cleanup can release them. Only safe stations accept new leases; unknown/hostile safety handling and retreat belong to behavior policy. Leases expire or release for replacement.

Validation: 244 tests passed in 2.88s; quality/Lizard passed with 97 production files and zero violations. Tests cover adjacency/room identity/duplicate tiles, reconstruction, cross-source contention, exact expiry and explicit release. This prevents tile overbooking, not yet source throughput saturation. Station observation, persistence, mineral rules, behavior, demand integration and actual mining engine scenarios remain.
