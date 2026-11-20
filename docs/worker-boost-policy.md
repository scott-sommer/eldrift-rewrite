# Automatic worker boost policy

ED-36 source `866d750` connects ordinary worker recruitment to the shared boost selector and spawn-carried contracts. It ports the automatic local upgrader and builder intent choices in legacy `spawner.js:2529–2563`, while retaining the rewrite's observed readiness and explicit failure decisions. The policy is opt-in and applies to new requests; it does not mutate queued contracts or retroactively boost existing workers.

## Configuration and decisions

| Key | Default | Behavior |
| --- | --- | --- |
| `workerBoostPolicy` | `off` | `optional` can spawn unboosted when a kit is unavailable; `required` waits before creating that birth |
| `workerBoostTimeout` | 200 | 1–1500 ticks following ordinary body spawn duration, measured from actual spawn admission |

Existing worker enable/spawning/targets/body-budget settings still govern recruitment. An upgrader requests the legacy `upgrade` effect; a builder requests MOVE, CARRY and `build`. Fortifier recruitment remains unchanged, matching the absence of an automatic fortifier boost branch in the referenced legacy helper. The dedicated Upgrade Room lifecycle and remote-upgrader exception remain separate. This increment retains ordinary body recipes; stock-dependent optimized boosted-builder body selection remains further parity work.

The selector runs lazily only for genuinely missing requests, rather than spending speculative kits on workers already alive or pending. Shared population demand accepts a narrow birth-boost callback. Each selected exact contract debits one pass-local ledger before the next birth is considered. A required shortage stops further creation for that demand without allocating a new identity. Optional shortage returns an explicit unboosted choice. Existing queued identities retain their original contract when policy or stock changes.

No accepted spawn or boost API response creates readiness. Contract intake, exact native part counts, persisted attempts and next-tick observations still belong to the industry executor. The worker owner consumes confirmed outcomes and optional failures so the bounded queue can reclaim them after cleanup. It does not automatically acknowledge required failures, failures owned by another feature or an absent request. Required failure therefore remains gated even if the operator later turns automatic boost selection off; abort/retry needs an explicit owner/operator decision.

## Funding snapshot and ownership

Native projection separates transferable bank stock from a **single matching lab** per compound. Bank stock preserves `labSupplyReserve` for minerals and `storageEnergyReserve` for energy in each bank, following the existing boost supply policy. Foreign stock claims are deducted. Eligible matching labs follow the executor's mineral-amount/ID preference; labs with foreign stock/capacity admission are excluded. Energy in an unrelated lab is not pooled into another compound's kit. Empty or wrong-mineral lab energy is conservatively omitted from selection funding.

A local compound kit can combine its own mineral/energy with transferable bank funds. Different requested effects share the bank ledger; each matching local kit is debited independently. The pure selector still accepts injected preferences and prices. Admitted boost-service courier cargo is included only through its service claim holder, so moving a promised resource from bank to courier does not erase the outstanding obligation.

Pending spawn contracts, actual birth metadata and unfinished boost steps all consume the projection. A queued name already observed as a creep is counted through birth/intake state rather than twice. Observed matching body parts reduce outstanding costs. Own boost quantity claims are not deducted a second time on top of their promised kit; other claim owners remain excluded. The projection reads queued requests in visible rooms, including a different production room whose contract names this home.

This is a fundability snapshot and protection against duplicate worker birth promises, not a new exclusive stock reservation spanning the whole spawn duration. Other features can change stock after selection. The existing executor acquires actual shared stock/lab/body claims before effects and can wait or fail under the original contract. Required actors never enter ordinary work from a stale stock assumption. The snapshot is intentionally conservative about inaccessible lab splits and does not claim globally optimal lab scheduling or empire allocation.

## Evidence

[CI 44795520191](https://github.com/scott-sommer/eldrift-rewrite/actions/runs/44795520191) passes all six required checks on exact source for Windows 2022 and Ubuntu 24.04. Final local checks pass 1,902 unit cases / 467 files in 14.20 s (concurrent native load), focused + smoke 32 / 7 files in 0.320 s, processor comparisons 4 / 0.216 s, suite report 1 / 0.1415753 s and bundle checks. Types/lint/boundaries and pinned Lizard 1.22.2 pass with 871 production / 713 test files and zero violations.

Fifteen clean native cases pass in 67.327 s: automatic normal/shortage/optional workers, explicit contracted birth, alias fallback, ordinary boost, reaction coexistence, supply, cancellation, expiry, worker population, spawn placement/migration, Upgrade Room, lab chain and packaged smoke. The three new scenarios each run 100 ticks through ordinary population demand and shared dispatch; the fixture does not seed a target worker or submit its boost request itself.

| New scenario | Observed outcome |
| --- | --- |
| Required, target 2, one 30-mineral/20-energy kit | Only one worker request/birth; second demand stays unfunded. Tick-2 reset preserves generated contract/deadline 93. Tick-18 issue confirms one actual XGH2O WORK part after reset at 19. Worker owner acknowledges success; progress reaches 144 at 100. |
| Required, no mineral | No request or worker across all 100 ticks, no false boost outcome or controller progress; lab retains 20 energy. |
| Optional, no mineral | Ordinary worker is born without a boost contract, has zero boosted WORK parts and no industry outcome; ordinary progress reaches 77. It is never labeled boost-ready. |

The normal case ends with no pending spawn request, lab mineral/energy, boost claims, attempt or pin. Fixture timings are observations rather than travel guarantees. Unit tests additionally cover all builder effects, shared/local energy, foreign claims, existing physical reservations, queued/live promise deduplication, lazy selection and required/foreign outcome retention. The full 263-case registry was not rerun. This is not aggregate CPU/memory/soak or cross-version rollback qualification. Full provenance, CI steps and row/source hashes are in [worker-boost-policy.json](evidence/worker-boost-policy.json).

## Compatibility and remaining scope

No persistence schema changes accompany this increment: spawn queues remain schema 3 and industry queues remain schema 1. Remove `workerBoostPolicy` and `workerBoostTimeout` from configured layers before running earlier configuration validators. Turning the policy off affects new selection, not immutable queued contracts, admitted native effects or required failures. Preserve existing birth metadata, boost outcomes, supply claims, tasks and journals through rollback; ED-44 retains the migration/release rehearsal obligations.

Remaining ED-36 obligations include operator controls, non-worker/specialist mission producers, optimized boosted body policies, empire-wide resource/production allocation and broader visibility/depletion/lifecycle qualification. Automatic worker selection is not full spawner, booster or resource-manager parity.


Subsequent increment: [operator boost commands](operator-boosts.md) exposes detached inspection, exact/alias admission, cancellation and settled acknowledgement in the packaged bot. General operator, lab/flag and remaining parity obligations are not closed by this API.


Subsequent increment: [configured boost-lab roles](industry-boost-lab-roles.md) adds explicit compound buffers, shared preload/refill, durable retiring-role exclusion and role-aware actor funding. Automatic/bulk assignment and remaining legacy compatibility stay open.
