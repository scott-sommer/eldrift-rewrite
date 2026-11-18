# Remote cargo banking

ED-29 remains In Progress. This increment delivers returning miners' actual cargo to owned home stores and confirms delivery through the existing hauling protocol. It does not recruit a dedicated container-to-home hauler or activate automatic remote orchestration.

## Composition and ownership

app/remotes/native-banking composes shared cargo recovery, quantity reservations, hauling tasks, transfer intents, event confirmation and uncertainty recording. It owns admission and handoff rather than another transfer actuator or credit ledger.

app/remotes/native-mining-cycle supplies one actor cycle and task runner for extraction, retirement and home banking. The binding contains an explicit home and population owner. A different role, home, spawning unit or non-owned unit is ignored before task state is read. The caller supplies already assigned units and optional current Mine demand; recruitment remains separate. Additional task definitions can be supplied so unrelated work remains valid and untouched.

Preparation identifies owned bank work and settles its previous effect before task expiry or cancellation can discard it. It can interrupt an explicitly listed, solitary remote task only when loaded cargo has reached an admitted owned home interior. Unknown or queued unrelated work is preserved. A journal with an unresolved unbound attempt holds admission instead of inferring a delivery. The remaining actor loop uses the same task runner for service and hauling.

A bank task has a fresh cargo-recovery request identity, independent of the canceled source assignment. Its sink is in the owned home; shared quantity claims account for real sink capacity. An existing bank task can return from outside the home through the admitted retirement route. Home ownership loss cancels that bank request and releases its task scope without issuing a new transfer. Transient unsafe-home/CPU admission holds effects. Broader alternate-home evacuation remains integration work.

Only observed event confirmation credits delivery. Scheduling OK does not credit it. A missed event window follows the existing uncertainty archive/cancel/release protocol; it never credits the ambiguous old request from the current cargo amount. Any later recovery uses a new receipt identity. The native trace also rejects a receipt identity appearing under another request binding or changing amount.

## Policy

The banking policy is separate from movement admission. It exposes terminal headroom, resource eligibility and sink eligibility; the actor options forward it through banking. Defaults retain the shared recovery preference for durable stores, then energy consumers and containers. Default terminal headroom is zero; production composition can supply a reserve and resource/destination filters. A policy snapshot prevents later input mutation from changing that numeric reserve accidentally. Native scenarios exercise energy; they do not qualify specialist mineral workflows.

## Executed native scenarios

Each case runs 160 engine ticks with real spawning, extraction, threat retreat, bank-task handoff, transfer events and cleanup. Typed source assignment cancellation is triggered after tick 100 when the source worker has at least 20 energy, so return delivery is exercised with real cargo. Initial target vision is removed and later restored by the fixture, as in the extraction scenario. A home storage is supplied by the fixture; no construction claim is made.

| Case | Observed delivery credit | Explicitly uncertain | Result |
| --- | ---: | ---: | --- |
| Normal | 48 | 0 | Both home deliveries confirm across actual global resets at the confirmation boundary. |
| Sink loss | 56 | 0 | The empty selected storage disappears during approach; its request cancels and cargo reaches a fallback sink. |
| Missed confirmation | 20 | 28 | One actor confirmation tick is intentionally skipped. The prior physical effect remains uncertain and uncredited; later observed delivery confirms normally. |
| Full stores | 48 | 0 | Cargo waits without bank claims until controlled capacity release, then delivery and source service resume. |

The full-store case injects/removes fixture stock to control capacity. Its net external adjustment of 999,350 energy is recorded separately and subtracted from the physical home-stock comparison. Those injected resources are not reported as bot income. Home stock reconciles exactly with observed credit plus the explicitly uncertain effect in this controlled single-actor world.

Every case verifies no credit on the issue tick, unique receipt/request bindings, completed or canceled banking requests, no final bank/tile claims, an empty returned worker with no task, and preservation of unrelated quantity, mutex and request witnesses. The harness reloads the actual global before confirmation attempts. The gap case intentionally misses one confirmation window after that reload, testing the conservative path as well as normal reset recovery.

The initial fixture run failed because its unrelated sentinel request had identical source and sink IDs. Shared validation correctly rejected initialization; the fixture was corrected. The failure's provenance and exception are retained alongside successful results.

## Qualification and limits

Clean committed f244ebf passes all four native banking cases. The manifest at docs/evidence/remote-banking-native.json retains original evidence digests, complete provenance, samples, receipts, request state and scenario controls. Per-tick observations are stored losslessly as one JSON object per line in four adjacent JSONL files; row counts and byte digests are recorded and round-trip equality was verified when archiving.

Focused checks: 12 tests / 3 files pass in 359 ms. Full units: 1,303 tests / 355 files pass in 9.17 seconds. Type checking, lint, dependency boundaries and packaged CommonJS/no-Node-globals checks pass. Pinned Lizard reports 602 production files and 507 test files, with zero violations. Related native mining, reservation, cargo recovery and storage-loss regressions also pass.

The four cases are registered in the now 196-case suite; a full 196-case run is not claimed for this component increment. The earlier full regression baseline remains 191 clean cases on f0ad244. Probe rows, cumulative receipt bindings and scenario controls contribute to fixture Memory/CPU; production pressure and soak acceptance remain ED-43 work.

Remaining ED-29 work includes dedicated remote transport, bounded automatic collection/selection/recruitment, production body/travel/health/replacement policy, source reachability and exclusions, road/container desired-state execution, cross-home/alternate-home handling, dead-unit maintenance integration, specialist readiness and final combined acceptance. Public operator input and legacy memory translation remain tracked separately.
