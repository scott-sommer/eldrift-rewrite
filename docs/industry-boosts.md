# Explicit boost requests and observed actor readiness

ED-36 now runs explicit per-creep, multi-step boost requests through the ordinary bot. It reserves the requested actor and a selected lab, uses shared hauling for mineral/energy supply, approaches through shared movement and releases successful work only after body observation. This is the generic orchestration foundation; automatic alias-based spawn/mission request producers, console operations and empire-wide resource allocation remain required before full parity.

## Reference and corrections

Legacy booster.js lines 11â€“80 and controller.js line 916 gate role execution using creep.memory.boost. The old helper moves to a lab, calls boostCreep and removes the requested alias immediately on acceptance or error. The rewrite intentionally distinguishes issued, observed confirmation and failed/cancelled outcomes. It does not claim completion from OK or from depleted lab stock.

The request names exact compounds and body-part counts rather than selecting legacy aliases such as upgrade/build or their tier fallbacks. Already matching live body parts count toward the target. Incompatible existing boosts, insufficient eligible parts and destroyed unboosted eligible parts cause explicit failure; the controller avoids paying for disabled parts that the pinned processor could otherwise select. One compound per body-part type is currently allowed, with up to eight distinct types and at most 50 requested parts. Mixed compounds on the same type and legacy fallback/remote-upgrader policy remain further work.

The API/processor accepts a bodyPartsCount limit. The native action adapter passes the observed missing count, so a request for one MOVE part does not boost every unboosted MOVE part. The pinned processor charges LAB_BOOST_MINERAL/LAB_BOOST_ENERGY per applied part; orchestration uses those game constants. [Screeps boostCreep documentation](https://docs.screeps.com/api/#StructureLab.boostCreep) and the pinned 4.3.2 processor are the references; native execution supplies the behavioral evidence.

## Owners and control flow

The feature-owned industry-boosts/empire schema 1 queue retains up to 64 requests/outcomes. Each request binds immutable owner/id, native creep ID, name, home, exact steps, deadline and required/optional policy; an optional preferredLab binds selection. Duplicate requests replay only with equivalent identity. A conflicting request cannot replace existing gated work. Reads detach state. Acknowledged outcomes can be evicted under capacity pressure only after lab cleanup; unacknowledged outcomes and pinned cleanup are preserved.

Before normal room scheduling, native composition checks each bound native identity and claims its existing action-adapter name key. Body/lab admission uses native IDs. Persistent per-tick body-owner and lab-owner leases protect renewal, boosting and all reaction input/output roles through the existing structure-intent owner. No creep task is erased or replaced by this gate. The bounded processor advances eight eligible jobs fairly per tick; all held actors/pinned labs receive their gates before that processing budget. Settled jobs with no cleanup are not repeatedly processed.

Lab selection prefers matching stock, then empty labs, with deterministic ID ties. It refuses other boost pins or admitted foreign stock/capacity work. On pinning, the controller cancels unclaimed reaction services for that lab and excludes it from reaction topology and local production inventory. Admitted services keep their normal settlement/recovery path. A lab remains pinned until supply cleanup settles, even if actor boosting has finished.

Incompatible lab minerals drain first. Exact missing mineral supply precedes energy supply through ordinary logistics requests. Chemical supply preserves labSupplyReserve, energy supply preserves storageEnergyReserve, and banks retain their existing free-space floors. A complete remaining kit is atomically reserved in the shared stock pools before approach/boost execution; no promise is made from unavailable stock. Other compatible requests may own earlier claims, so admission can wait. Missing minerals are not automatically synthesized by this request controller; production targets remain a separate policy.

The attempt journal is persisted before invoking the lab. It records tick, part, resource, before count, missing count and nullable return code. Re-entry/global reset cannot issue that attempt again in its original tick. Later exact body counts decide whether to confirm, retry only remaining parts, or fail due to identity/body loss. Persistent body state can confirm after a delayed observation; this does not depend on a one-frame event-log receipt. Structure API acceptance is never a mission-ready signal.

## Required failures and caller decisions

The application-facing methods are submit, get, readiness, cancel and acknowledge. update/batch/read are industry-owner mechanisms, not mission methods for assigning success. Readiness is absent/waiting/ready/failed. Only observed confirmed requests return ready.

Required failed, cancelled or expired jobs retain the actor action gate until the request owner explicitly acknowledges the failure. That acknowledgement is a decision to abort/fall back, not boost success. Optional failed jobs release the actor automatically but still return failed. Confirmed jobs release automatically; owners should acknowledge once their own mission state has consumed the outcome. Otherwise the bounded queue preserves it for polling. Concrete combat mission producers/activation are not ported by this increment; callers must use readiness and the shared actor ports.

Cancel after issue waits for body observation: an already admitted native effect can still consume resources and boost parts, and the cancelled outcome records those observed counts without becoming ready. A final action admitted before the deadline may still confirm afterward. Gate/structure leases remain conservative for the rest of their tick, so normal actions can resume on a later tick after confirmation/acknowledgement. Missing identities or owner/home reassignment never transfer readiness to a replacement creep.

The default bot creates no boost namespace or requests by itself. A caller must explicitly submit before actor activation, for example with owner matching the creep's population owner, unit matching creep.id, home matching population.home and steps[{part:WORK,resource:RESOURCE_CATALYZED_GHODIUM_ACID,count:2}]. Requests submitted after a tick's gameplay are handled on a later tick; earlier native intents are not retroactively revoked. Supply requires an available ordinary courier. Existing active tasks remain owned and can resume/recover afterward; callers should coordinate requesting boosts before starting task-heavy missions.

## Persistence and rollback

The queue validates request shape, distinct part types, attempt binding, observed confirmation counts, unique held actors and unique lab pins. Current readers refuse unsupported future queue versions. Per-request native failures are reported and retain conservative ownership; other valid jobs continue. Unsupported/corrupt global queue state is refused rather than silently cleared; gameplay cannot safely proceed through an untrustworthy ownership gate.

Existing industry-labs, industry-production, logistics, task and quantity schemas are unchanged. Structure-intents/dispatch stays schema 1 with additional ephemeral body-owner:<id> and lab-owner:<id> keys. Older structure readers accept the envelope but do not enforce those new lease semantics, so these keys are not a downgrade refusal mechanism.

Before rollback to pre-boost code, stop submitting requests, settle/cancel admitted effects, consume or explicitly acknowledge outcomes, finish admitted supplies and verify lab/stock cleanup under current owners. Preserve actual task/request/journal/receipt state. Older code ignores the new boost namespace and would not maintain its actor gates; do not deploy it while required boost work is still gated. There are no new configuration keys in this increment. Full cross-version rollback rehearsal remains ED-44 work, including pending attempts, required failures, optional fallback and lab supply still in transit.

## Qualification

Final source be9cc8a uses implementation fb7f70d plus coexistence fixture qualification. Full local units: 1,860 cases / 460 files in 12.46 s, focused + smoke: 31 cases / 8 files in 0.376 s, type/lint/boundary checks and Lizard 1.22.2 pass, with 861 production / 700 test files and zero violations. Local processor comparisons: 4 in 0.198 s, suite report: 1 in 0.1313682 s and bundle checks pass. Local full checks preceded formatting/coexistence-only fixture changes; final hosted [CI 44782314348](https://github.com/scott-sommer/eldrift-rewrite/actions/runs/44782314348) reruns all six required checks on exact final source for Windows 2022 / Ubuntu 24.04.

Sixteen clean native scenarios pass in 80.987 s: normal, supplied, multi-step, in-flight cancel, expiry, actual owned-lab destruction, two-unit contention, boost/reaction coexistence, automatic lab chain, manual lab switch, structure actions, Upgrade Room, ordinary worker runtime, remote transport, final delivery and packaged smoke. Each boost case observes 100 ticks. Every issued resource/actor pair reloads the bot on the next tick to exercise the persisted attempt boundary.

| Case | Outcome | First readiness observation | Specific evidence |
| --- | --- | ---: | --- |
| Normal | confirmed | 14 | two WORK parts; ordinary work remains gated beforehand |
| Supply | confirmed | 32 | 10 K banked, mineral/energy delivered through ordinary courier |
| Multi-step | confirmed | 19 | two WORK then exactly one of two MOVE parts; no role work between steps |
| Cancel in flight | cancelled, not ready | none | two actual boosted WORK parts retained; required gate held until acknowledgement at tick 40 |
| No stock/deadline 12 | expired, not ready | none | no boosted parts; explicit acknowledgement at tick 40 permits fallback |
| Owned lab destroyed | failed, not ready | none | actual destroy request at tick 4; no boosted parts, fallback only after acknowledgement at tick 40 |
| Two creeps/one lab | both confirmed | both by tick 28 | serialized kits; no early actor work or shared lab pin |
| Reactions coexist | confirmed | 13 | reserved lab excluded while ordinary topology banks 10 OH |

These are observed fixture times, not travel guarantees. All pending/unacknowledged required actors retain their original 40 energy; issued rows are never ready. Role progress resumes after confirmation or deliberate failure acknowledgement. End states have no boost stock claims, attempts or lab pins. Reset witnesses bind to each attempt's tick+1. The retained Upgrade Room boost policy remains separate and passes regression; replacing its optional legacy policy is further adoption work.

An earlier unpublished prototype claimed the new actor gate by native ID while existing action adapters use names. Its native verifier caught worker energy falling to 38 at tick 5 before readiness; that run remains explicitly failed with dirty provenance, even though its boost eventually completed. A native port-contract test and all corrected ordinary-worker scenarios protect the fix. The [manifest](evidence/boost-orchestration.json) preserves that failure separately from sixteen clean successes, with source/raw hashes, actual body/resource observations and reset witnesses.

Registry: 258 scenarios was not fully rerun. Fixture rows contribute to measured memory; this is not ED-43 soak/aggregate-memory qualification. Remaining ED-36 work includes automatic adoption of alias/tier and remote-upgrader policy through spawn/mission request producers, operator controls, empire-wide production allocation and wider cancellation/depletion/visibility/migration scenarios before full module parity.


## Alias selection continuation

Source `1ca7137` adds `selection-policy.ts` and `legacy-preferences.ts`. The latter ports all nine intent mappings and their three-tier preferences from legacy `booster.js:77–129`: MOVE, HEAL, dismantling WORK, ATTACK, RANGED_ATTACK, TOUGH, upgrade, build and CARRY. WORK/upgrade/build share a body type but select different effects. Conflicting intents on one body type refuse rather than issuing mutually incompatible requests. The role-specific remote-upgrader skip from line 19 returns an explicit skipped outcome, never boosted readiness.

`selectBoostPlan` accepts injected preference records and mineral/energy prices. Callers provide unreserved stock after their policy floors; it does not read Memory/Game, reserve stock, allocate labs or promise success. It selects the strongest affordable whole-body tier in caller order, accounts already matching live parts toward target counts, and subtracts missing-part costs from a shared local mineral/energy ledger. Inputs remain unchanged. Unknown aliases, conflicting body types and invalid/beyond-bound inputs refuse. Missing, disabled or incompatible body parts and unaffordable kits return unavailable without a partial plan. A caller must decide whether to wait, abort or deliberately accept optional fallback.

This intentionally corrects advertised-lab availability and immediate alias removal in the old helper. Selected exact steps enter the existing immutable request store, whose stock/action owners still perform actual admission and later body confirmation. The snapshot may become stale; the executor can wait or fail under its ordinary deadline/required policy. The policy does not silently reselect an already submitted request. Empty/remote-skipped intents are caller decisions rather than empty successful boost requests.

The new `--boost-alias` fixture projects actual lab stock into this policy, then submits the selected steps to ordinary native orchestration. XGH2O is unavailable; the lab contains 60 GH2O and 40 energy. Actual next-tick body observation confirms two GH2O WORK parts at tick 14 following an issued-at-13 reset, after which ordinary upgrading resumes. End lab mineral/energy, attempts, boost claims and pins are zero. Unit cases cover all 27 tier choices, aggregate energy, already boosted parts, conflicting effects, custom preferences/prices and remote skip. This is fixture-driven application integration: automatic spawn/mission request producers and their unreserved-stock projection remain open, along with operator adoption and empire allocation. Default ordinary scheduling has no automatic alias request producer.

Qualification is recorded separately in [boost-selection.json](evidence/boost-selection.json). Earlier qualification and failed-prototype evidence above remain historical records. No new persistence or operator configuration schema is introduced by this selection policy.


Subsequent increment: [boost requirements through ordinary spawning](industry-boost-births.md) adds optional exact contracts to shared demand/dispatch, automatic native birth intake and spawn queue schema 3. Generic queue and role/mission adoption limits are documented there; earlier manifests retain their original source/schema context.


Subsequent increment: [automatic worker boost policy](worker-boost-policy.md) adds opt-in ordinary upgrader/builder selection, native funding/promise projection and worker-owned outcome consumption. Earlier manifests retain their source-specific scope and configuration.
