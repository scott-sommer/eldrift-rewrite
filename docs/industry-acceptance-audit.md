# ED-36 acceptance audit

Audited at clean runtime/fixture checkpoint `9df5a39672c7cb6f54463ee187cdba5c59bf9ed8`. Jira ED-36 remains In Progress; prerequisite ED-16 and ED-22 are Done. This audit preserves the original task scope and the full rewrite objective. It does not turn partial module parity into completion.

## Original acceptance criteria

| Criterion | Evidence inspected | Conclusion and remaining gate |
| --- | --- | --- |
| Game constants, priorities/reserves, topology, stock and reservations | capabilities/industry/labs and production; native-labs/native-production-inventory; [reaction qualification](industry-lab-reactions.md), [chains](industry-lab-production.md), [shared production](empire-lab-production.md) | Bounded direct/local/shared behaviors are qualified on their recorded sources. Legacy resourceManager intermediate global stock-floor/default-policy semantics still need an explicit implementation/disposition; uniform input reserves are not an equivalent policy. Current-source consolidated milestone validation remains required. |
| Mineral/energy reservations, actor ownership and readiness only after observation | industry boost request/observation/claims; native-boosts/native-boost-cycle; [boost contracts](industry-boosts.md), [builder producer](boosted-builder-recipe.md), specialist manifests linked from shared production | Generic ownership/readiness and concrete work/specialist consumers have native evidence. This does not prove combat mission producers or complete specialist modes: those remain ED-31/33/35 work. Literal operator input compatibility remains ED-39. Preserve these integration obligations rather than treating the generic API as full mission parity. |
| Shared extraction/courier integration and retention of intel/state under visibility loss | [fresh extraction through banked OH](evidence/mineral-industry-native.json), [owned-room loss/intel qualification](empire-lab-production.md) | New 640-tick pipeline proves automatic miner birth, native extraction, both shared transport stages, loaded reset and finite reagent conservation in one ordinary bot. Separate loss/vision scenarios prove retained owned state/intel; the pipeline does not claim combined mining/vision-loss recovery, regeneration or throughput/soak. |
| Chains, invalid layout, cooldown, depleted reagents, cancellation, lab destruction and reset | Native lab-chain/reserve/depleted, lab-reactions-invalid/destroy, boost-cancel/expiry/destroy, specialist loss and preload cases in the registry; [transport](industry-lab-transport.md), [boosts](industry-boosts.md), shared-production manifests | Those bounded cases have source-qualified archives. The current registry has not had a consolidated rerun after all integrations. Historical successes alone do not establish current-source milestone success. |

## Source responsibilities and open work

- ED-36 retains production policy responsibilities: distinguish global intermediate inventory targets from final demand and local spendability. Port or explicitly characterize the legacy terminal-count-dependent intermediate floor, duplicate symbolic upgrade/fixed-product thresholds and default policy behavior. The explicit legacyTargets helper preserves ordinary defaults/order and refuses ambiguous duplicates; that refusal is not full preservation of every legacy policy setting.
- ED-39 already owns baseline flag/console compatibility, typed per-creep controls and explicit agreement for changed inputs. Modern lab APIs and source-characterized replacements do not establish literal Game aliases or legacy Memory import. Do not silently declare raw cache reset and asynchronous replan identical.
- ED-37 already owns terminal transfers/market/shared stock and capacity arbitration, including Upgrade Room trade supply. Existing warehouse-local supply is not inter-room trade parity.
- ED-31/33/35 retain concrete specialist/vassal, combat mission and keeper/power-bank integrations. The shared boost contract is reusable infrastructure, not evidence those modes have been ported.
- ED-38 retains advanced structure service, including the mineral courier's active nuker/power-spawn duties. Its general container/lab hauling responsibilities are separately ported. The role inventory now reflects this split instead of attributing the entire module to boost orchestration.
- ED-39/44 must characterize mineralCourierV2 sleep accurately: its active branch calls suicide before decrementing the old sleep field. A safe finite pause is a deliberate correction needing explicit tests and documentation; it is not literal reproduction of that side effect. Renewal/retirement and legacy job import also remain explicit.
- ED-42/43/44 retain whole-source parity, measured pressure/CPU/memory/soak, migration/rollback and reproducible release-candidate gates. Paused reaction state is ignored by older bots; retaining its namespace cannot enforce a downgrade pause.

These are responsibilities within the existing backlog, not replacement or reduced acceptance criteria. No issue is closed by this audit.

## Milestone gate

Before closing ED-36, resolve its remaining production-policy obligations, consolidate the original criteria against exact current sources, run the relevant native industry/mineral/integration cases, and run `npm run test:full`. Dispatch Quality with `full_unit_suite=true` on that exact milestone source and inspect both OS full-unit steps. Routine CI smoke is not full-suite evidence. Keep the broad goal active through remaining backlog, parity, layout and release gates.

For the current evidence-gap increment, smoke 76/15 files in0.477s, quality906 production/774 test files with zero Lizard violations and suite-report1/.1248974s pass. The corrected pipeline source also passes native colony-mineral and mineral-transport regressions plus routine Windows/Linux CI44879311033, whose full-unit steps are skipped. Full units were not run for this incomplete milestone; no closure prerequisite is claimed satisfied.

## Production-policy implementation follow-up

The [threshold policy](industry-stock-policy.md) now implements the identified separation of intermediate stock demands and final thresholds, including configurable terminal scaling and duplicate-product priority boundaries. Native shared/local/priority validation is pending at this implementation checkpoint. Do not mark the preceding original-scope gates complete from portable tests alone; consolidated milestone/full-suite and downstream obligations remain required.
