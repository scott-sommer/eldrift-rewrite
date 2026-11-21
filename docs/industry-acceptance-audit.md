# ED-36 functional acceptance

Qualified source: `d2bd05bb20f2378261cf49986e2423391db73874`. The original production/lab/boost/mineral criteria are satisfied by the [consolidated milestone evidence](evidence/ed36-milestone.json). Prerequisites ED-16 and ED-22 were confirmed Done. Jira remains authoritative for workflow status. This accepts ED-36's stated functionality, not whole-module legacy-input compatibility or the overall rewrite/release objective.

## Original acceptance criteria

| Original criterion | Current-source proof |
| --- | --- |
| Reaction planning uses game constants and explicit priorities/reserves; lab topology, input/output stock and reservations are validated. | Native direct reactions, invalid topology, cooldown/reset, supply/drain, local dependency chains, priorities/reserves/depletion, shared windows and stock-policy cases all pass. The threshold policy distinguishes final targets from global terminal-scaled intermediate inventory demands and preserves duplicate threshold priority. A separate pinned-chemistry contract probe covers34 reaction products with at most7 target records. It is not native large-stock throughput evidence. |
| Boost reservations coordinate resource/energy availability, creep ownership and mission gating without claiming success before next-tick observation. | Required owner/home/native-ID-bound actor/body/lab gates, atomic mineral/energy claims, counted effects, next-observation readiness, cancellation/deadline/loss and explicit owner acknowledgement pass. Work/birth/builder producers and specialist renewal/boost coexistence, mode handover, lab loss and admitted preload pass. This qualifies the shared mission-facing readiness/action gate; concrete combat/keeper/power mission producers remain their existing downstream tasks, not a claim that those missions are ported. |
| Mineral extraction/courier integration uses shared extraction/logistics; visibility loss does not erase room intel or other feature state. | The640-tick mineral-industry case starts without a ready miner or H outside its finite15-unit deposit: ordinary birth/extraction, container-to-bank and bank-to-lab receipts, loaded reset and15bankedOH conserve H throughout. Separate native owned-room loss/vision/intel cases retain last-known industry state and intel across blindness/reconstruction and reacquisition. |
| Scenarios cover reaction chains, incompatible lab layout, cooldown, depleted reagents, canceled boosts, lab destruction and reset. | The same-source63-case campaign includes direct invalid/destroy, six chain/transport branches, cancellation/expiry/destroy, shared ownership/vision/intel/pause, duplicate thresholds and specialist loss/replacement. Every case reports passed, dirty=false and the same source, with no unexpected engine errors. |

## Milestone gates actually executed

- `npm run test:full`:2,009 tests/491 files passed in13.48seconds on the exact source. Incremental default remains76 smoke tests; this full run was the ticket milestone prerequisite.
- Local types/lint/boundaries/Lizard:908 production/779 test files, zero violations. Processor comparisons4 tests/.194seconds, bundle (23lab methods) and report integrity1/.1213976seconds pass.
- Manual [Quality44886186379](https://github.com/scott-sommer/eldrift-rewrite/actions/runs/44886186379) ran on the exact source with full_unit_suite=true. Windows2022 and Ubuntu24.04 both pass quality, smoke, the full-unit milestone step, processor comparisons, report validation and packaging. Earlier routine smoke CI is not substituted for this gate.
-63 serial native scenarios pass in761.527seconds on one clean source. The294-case full registry was not rerun; unrelated remote/layout/military and release aggregate gates remain later work.
- Chemistry policy is checked against all34 products in the pinned constants with a50-terminal target; this is a pure contract check, separately identified from native effects.

The first aggregate stopped after25 passes when the intel-history case reached its60second harness deadline at sample601/tick602 without engine errors. The case retains growing assertion histories in Memory; this timing/memory is not a production soak measurement. Only that fixture's bounded allowance changed to120seconds, leaving640ticks/assertions intact. A fresh complete campaign passed; intel took65.103seconds. The prior26-attempt failed campaign and its raw evidence remain separately archived, never counted as milestone success.

## Preserved downstream obligations

Source modules remain granular/partial where the existing backlog owns more behavior. No requirement below is declared implemented by closing ED-36:

- ED-31/33/35: concrete specialist/vassal/combat/keeper/power-bank modes and their consumers of the shared boost contract.
- ED-37: inter-room stock/capacity/cooldown allocation, terminal balancing, market policy and Upgrade Room trade supply.
- ED-38: advanced structure service, including mineralCourierV2's active nuker/power-spawn duties.
- ED-39: literal baseline flags/console inputs, compatibility aliases or explicitly characterized changes, typed finite per-creep controls. Modern APIs are not proof of literal Game aliases. Mineral courier sleep invokes suicide in the old source; a safe pause is a deliberate correction requiring its own tests/documentation.
- ED-42/43/44: whole-source parity, pressure/CPU/memory/soak, old-state import, live migration/rollback rehearsal and a reproducible release candidate. No live deployment is performed.

Deliberate corrections remain explicit: native ownership replaces hard-coded identity, actor readiness requires actual body observation, global pause does not erase admitted work, terminal counts refresh dynamically, and independent intermediate ties follow canonical REACTIONS lookup rather than copying the old chemistry table. Global intermediate targets are demands, not per-bank spend floors or caps; final batches may consume them. These behaviors and the four new configuration-key downgrade requirements are documented in [stock policy](industry-stock-policy.md).

## Durable archive verification

Raw native results and local logs are gzip-compressed byte-for-byte, with compressed and decompressed SHA256 hashes. All domain observations/measurements are also hashed JSONL. Verify the published Git bytes from the repository root:

```powershell
python tools/evidence/verify_archives.py docs/evidence/ed36-milestone.json --published
```

The verifier checks95raw archives and152row archives, including the separate failed attempt history and multiple domains per case. Those archive counts are not counts of successful scenarios. The manifest preserves per-case provenance, full workflow jobs, exact commands/scopes and remaining release obligations.

Initial audit/history is retained in Git at6d3be18 and later implementation commits. The production-policy gap it identified is now implemented and included in this consolidated gate rather than left open in stale narrative.
