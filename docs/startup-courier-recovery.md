# Scheduled private courier recovery

ED-29 remains in progress. The private whole-home world can now compose current courier banking policy and explicit recovery paths. This advances lifecycle modelling; it does not enable a native future financial calendar or live deployment.

## Control and ownership

`HomeWorldEnvironment.courierBanking` supplies current eligibility, owned-home/route admission, sink descriptors/policy, capacity pools, target/range observations, approach and home-return behavior. The world composes the existing `createForecastRemoteBanking` controller through a narrow hauling-service port. Home visibility remains the single transfer-event visibility owner. Banking uses the existing request/quantity/task/journal owners and the shared physical inventory; a receipt is observed once and never deposits physical stock again.

Scheduled paid visits preserve native ordering: settle previous liabilities; service owned productive work first; on invalidation cancel the owned request/task and hand off movement before returning home; otherwise prepare/execute banking before recruiting another productive trip. A deferred paid visit does no banking work; fleet settlement still precedes optional work. An outside task owner can cancel loaded work before the visit and the same scheduled service recovers its cargo. Without a configured recovery environment, previous explicit forecast refusals remain.

Banking is independent of productive authority and cutoff. It may clip a request to actual available sink capacity and then select another currently accepted sink for residual cargo. The bank-specific opening resolver accepts that completed clipped request with remaining physical cargo only for a bound native cargo-recovery task whose source is the same native body. The productive-opening resolver retains its stricter cargo rule. Both still require actual past transfer confirmation; missing/unknown evidence is not income.

## Physical movement

`movement/retirement.ts` owns the immutable body/lifespan binding plus current recovery plan, observed cursor, ready time, cargo and fatigue. `retirement-frame.ts` separates observation/validation and productive-cutoff handoff from frame arbitration. The original productive program is retained unchanged for lineage; the active retirement route is checkpointed separately.

At the productive cutoff, an alive courier holds its actual current tile until an explicit owner submits a recovery path. Productive route requests refuse after handoff. `HomeWorldShared.recoverCourier` accepts an explicit path/command, or continues the saved path; it never fabricates geometry or teleports to an endpoint. Replanning starts at the actual observed pose, preserves fatigue and obeys current room policy. The existing transit cursor, fixed-path executor, common traffic/dependency solver, cargo weight and terrain fatigue mechanism are reused. Unrequested bodies retain occupancy and recover fatigue. Movement intents share the existing action arbiter and one-request-per-body rule.

Recovery plans cannot extend the body's paid lifetime or alter native identity/capacity/MOVE recovery. Restore checks plans/cursors, the original immutable program, expected physical continuation and bounded roster. Productive snapshots may remain historical only for validated retirement entries. Natural physical expiry prunes both the original and retirement route; before-retirement settlement can confirm a final banking deposit and archive it exactly once across JSON continuation.

## Incremental evidence

- Three movement cases cover cutoff occupancy, denied traffic without cursor progress, identical JSON continuation, explicit alternate-destination replanning, loaded swamp fatigue, empty cargo, policy/duplicate-move refusal, identity/mobility/lifespan/cursor corruption and the natural lifetime boundary.
- Three scheduled whole-home cases cover banking after cancellation/cutoff, an explicitly deferred banking visit,32 energy confirmed once after JSON continuation,16+16 deposits to two physical sinks without another collection, and a last-alive-tick recovery deposit confirmed/archived after expiry with route pruning.
- One additional opening case preserves productive refusal of residual task cargo and checks bank-only identity/home/source admission. Existing relevant tests remain in the targeted selections.
- Final main affected selection:57 tests/11 files,1.08s. Supplemental state/transfer/admission/native-context plus banking selection:24 tests/5 files,994ms (overlaps the main selection). Fixed smoke unchanged at76 tests/15 files,590ms. Typecheck, lint, architecture boundaries, Lizard (1220 production/990 test files, zero violations), packaged CommonJS/no-Node-globals build and whitespace checks pass. Full units and exact-source closure CI remain milestone requirements and were not run for this incremental work.

## Remaining qualification

The caller must still supply a complete current recovery environment and explicit physical paths; there is no default speculative sink, route or capital credit. These integration cases use a known home-room corridor, selected bodies and physically available stores. They do not qualify arbitrary multi-room recovery, automatic path generation, return from recovery to a renewed productive route, native opening capture of already-banking couriers, ambiguous surviving-courier event gaps, prospective spawns/replacements, all household actors or the complete future native dispatch/financial calendar. Existing native banking supports broader operating behavior; porting that behavior into the future world remains required. Full horizon, strict CPU budget, parity, pressure, migration/rollback and RC gates remain open.


## Clean native mechanism regressions

Both focused native checks pass without reported errors on clean published implementation source `97c5c26d6f2f8436f4c7a8593986a3281df18622`:

- `--remote-banking-full`, `engine-8m30Uu`:160 ticks,48 confirmed energy, two actual confirmation VM resets (85/144), sink full40 and released61. Existing assertions retain zero banking claims/credit while full, distinguish fixture external energy999350 from receipts, reconcile final physical stock, and finish with zero cargo/tasks/banking/station claims. This is native shared-banking regression; the supplied fixture controls sink filling.
- `--final-delivery`, `engine-8xfwO0`:four ticks, existing harness confirms the last-alive-tick30 transfer after death, with final task/quantity cleanup and one acknowledged archived journal. Detailed trace assertions remain in `tools/engine/final-delivery.cjs`; the report records status/provenance rather than exporting that trace separately.

Exact source, deterministic full raw reports and hashes: `evidence/startup-courier-recovery.json`. These native checks exercise the reused native mechanisms and preserve their assertions. The newly composed private future recovery calendar is evidenced by the integration cases above, not by claiming these native fixture runs execute it. Full financial/dispatch/RC qualification remains open.
