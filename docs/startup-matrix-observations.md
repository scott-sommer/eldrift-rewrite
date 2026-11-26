# Current-tick native geometry sharing

Source b3629eb extracts native room geometry observation from matrix construction. createRoomCostObservations owns a bounded256-room cache that is discarded whenever Game.time changes, including clock reversal. A replacement Room object forces a fresh read even within the same tick. All stored arrays and copied coordinate/id records are frozen; no SDK objects, matrices, leases, financial approvals or quantity claims are retained. Callers can inject an alternate observation function or clock.

The default geometry observer is shared across native matrix factories. Every matrix observation still checks current visibility, computes its own road cost and mover-specific occupancy, constructs a fresh mutable matrix and derives its topology revision. Existing prepared-matrix callers still receive clones. Vision loss returns unseen immediately; a replacement visible room object refreshes geometry. Heap reset discards the cache. No persistent format or namespace changes.

## Measurement that motivated the extraction

Diagnostic source2646c6c injects timing around the exact cost-matrix adapter boundary in test bundles only. The transform requires exactly one known source marker and fails if that boundary changes. Timing covers observation, cell construction, matrix writes and topology serialization. Repeated-room counts cross actor boundaries within one runtime invocation. Search counters are now scoped to runtime execution, excluding fixture setup. Diagnostic costs include nested SDK counter overhead and cannot be summed with SDK measurements as exclusive CPU.

Before sharing, engine-8CWVku recorded6096 matrix observations,2410 same-room repeats and69874 runtime room lookups. Home normal-window observations1719 included927 repeats; remote2230 included1455 repeats. Repeats may require distinct road-cost or mover variants: the extraction shares raw geometry rather than conflating matrices.

After sharing, engine-sNK6s7 recorded6481 observations,2695 room repeats and54696 lookups. Inclusive matrix timing222.02ms before versus200.59ms after is descriptive only: observation epochs, service actions and searches differ (557 versus832), so this is not a controlled speedup estimate. The portable contracts establish deterministic reuse; native samples show operation counts, not repeatable production CPU savings.

## Native outcomes

[Eight verified clean-source archives](evidence/startup-matrix-observations.json) retain the baseline failure and seven runs onb3629eb.

| Run | Result | Meaning |
| --- | --- | --- |
| Baseline measured engine-8CWVku | FAILED |3264harvest/3080delivery match,51vs53receipt frames |
| Shared measured engine-sNK6s7 | FAILED |3264harvest matches,2396vs3080delivery,41vs53frames |
| Shared untraced engine-Gpt3uB | FAILED |3264harvest matches,2396vs3080delivery,41vs53frames |
| Supported engine-78QLdf | PASSED |All61 exact receipts,3752harvest/3528delivery/88repair and existing birth/withdrawal/cleanup/capital assertions |
| Paths engine-QSikCH | PASSED |Native path compatibility |
| Traffic engine-JxvKET | PASSED |Current movement arbitration |
| Occupied exit engine-V4KGYe | PASSED |Occupied boundary handling |
| Fleet border engine-lMrYUX | PASSED |Remote border movement |

Untraced5ms first mining165/income182 match its observation34 forecast. The first receipt mismatch is313 rather than312; the strict calendar remains unqualified. The supported envelope does not substitute for that failure.

## Incremental checks and remaining work

Geometry/snapshot/probe targeted10tests/three files passed257ms; movement/cost/border contracts25tests/seven files passed249ms. Fixed smoke76tests/15files passed524ms. Typecheck, lint, architecture and pinned Lizard pass1045 production/903 test files with zero violations. Diagnostic bundle hook and ordinary CommonJS bundle loading pass. Full units, full registry and milestone CI were not run; these remain ticket-closing gates.

This completes the measured geometry-sharing increment. It does not solve the5ms paid-service gate, wider future household/refill/construction/reservation schedules, shared multi-source capital, longer-route replacement or home-loss recovery. Continue the broader economic integration under the separately qualified supported envelope, retaining5ms failures as an explicit unresolved gate rather than treating this local optimization as closure.
