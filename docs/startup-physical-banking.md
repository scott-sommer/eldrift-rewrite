# Shared remote banking control and private material settlement (ED-29)

Native and private remote banking now use the same portable control and work admission. `banking-control.ts` preserves eligibility before task reads, existing-bank settlement before task execution/expiry, unrelated-task protection, pending-journal hold, interior-home/cargo checks, explicit interruptible kinds, home/route refusal, scoped cancellation and request admission. `banking-work.ts` owns home-loss request cancellation, travel/route waiting and delegation to hauling. The native adapter retains SDK observations, actual route/CPU admission, cargo/resource/sink policies, recovery assignment and native hauling effects. Native mixed-resource banking is preserved.

## Private composition

`startup/banking-state/service.ts` composes those same owners with the existing hauling task/quantity reservations/transfer journal and physical inventory frame. The transfer mechanism now accepts a minimal generic name/unit actor instead of requiring courier quote metadata; courier composition explicitly retains its richer type. Sinks are ranked through the existing recovery priorities and stable ID tie-break against their current canonical free capacity. Outside capacity liabilities are booked by the common reservation owner. Recovery publishes only the amount actually admitted, retains excess cargo, and can select an alternate real sink after the original fills.

The injected banking environment supplies current actor/home/route/visibility/in-range/sink-policy and movement facts. Body position, cargo and capacity come from the private world. The banking source is carried cargo, never withdrawable body stock. Mixed cargo or nonenergy banking explicitly requires a broader physical resource model; it cannot be turned into energy. Native support for those resources is unchanged. Capturing a native actor already in banking work remains separate from transitioning a qualified remote-mine opening into banking during simulation.

Scheduled mining composition installs `banking.definitions` and calls `banking.prepare(worker, definitions, ['remote-mine'])` as its mode owner. The integration fixture uses this actual adapter; it no longer supplies a preset bank mode or successful transfer stub. Physical bank energy changes once at processor settlement. On the next frame the existing journal/request owner confirms the actual amount and releases bookings; it does not deposit again or emit a productive courier income row.

## Checkpoint and uncertainty

The previous physical-effect/journal validation is extracted into a shared helper used by courier and bank continuation. Banking restore retains the original unit/home/request binding and required previous-frame effect. Missing or substituted immediate witnesses refuse. If the actor legitimately misses the event window, the older pending journal and absent expired witness can resume, but the common confirmation owner can only settle unknown: archive the incident once, cancel/release/retire the journal and create no receipt. Physical material stays where the actual processor put it, independently of confirmed financial attribution.

The private state bound is now196 envelopes: at most64 selected actors times task, journal and ten-entry bounded uncertainty archive, plus four shared owners. This deliberately provisions the new owner without an unbounded map or dropping incidents. Restore validates the archive schema and original home/unit identities. Future household controllers may require their own explicit bounded allowance.

## Incremental evidence

- Banking/hauling/native banking initial selection24 tests/3 files769ms. Final banking/hauling/current actor/multi-source/native banking/work-cycle selection35 tests/6 files1.21s (overlap).
- Six bank integration cases cover physical deposit and immediate JSON continuation, partial/alternate deposits, outside liabilities and home/route refusal, home loss after a physical effect, corrupt witnesses/bindings and missed-event JSON resume with one uncertainty/no receipt.
- A20-energy initial body deposits20 exactly once. A10-capacity bank accepts10, then a real spare sink accepts the remaining10. An outside15 claim against20 capacity permits only5. A missed20 deposit remains20 physically while its cancelled request has no receipts.
- Final affected selection:57 tests/11 files857ms. Pinned transfer comparisons:4 tests/1 file551ms. Fixed smoke:76 tests/15 files507ms, selection unchanged. Final typecheck, lint, boundaries and Lizard pass (1207 production/980 test files; zero violations), as does the CommonJS/no-Node-globals bundle check. Full units and exact-source both-OS closure CI were not run for this incremental checkpoint. Clean targeted native evidence remains to be recorded below.

## Remaining qualification

This integrates remote miner banking after a qualified opening; it does not install a complete future financial admission calendar. Current environment/route/sink providers, native bank openings and outside liabilities, multi-resource physical state, body transitions, source/controller changes, household work and complete native dispatch/receipt calendars remain required. Do not treat a physical bank balance, uncertain deposit, orphan cargo or a booked transfer as permission to spend. ED-29 and RC gates stay open; no live deployment.
