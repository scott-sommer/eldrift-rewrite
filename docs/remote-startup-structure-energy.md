# Startup structure energy ledger

ED-29: portable physical stock component, not yet integrated into the project forecast or production admission.

The aggregate spawn pool cannot justify a transfer into one structure using another structure's free capacity. This ledger tracks each declared spawn/extension separately, with outgoing-stock and incoming-capacity reservations as liabilities. A birth debit follows the supplied origin order atomically; insufficient stock or a debit touching reserved stock leaves the ledger unchanged. It does not rearrange native debits to evade reservations. Deposits stop at the chosen structure's unreserved capacity. Births precede transfers within a modeled frame.

The caller supplies the exact charge order. Existing native spawn execution omits energyStructures; pinned engine defaults to owned active spawns sorted by distance, then extensions sorted by distance. Explicit lists use their declared order. The ledger does not infer distance ties or certify that a future native producer supplies the same order.

Checkpoint format 1 binds initial physical facts, reservations and orders. Restore replays bounded events and checks point conservation; structure enumeration order is immaterial, charge order is material. Limits: 128 structures, 16 origins, 8192 events, 1 MiB checkpoint. The ledger owns neither production Memory nor real reservations, actions, queues or cash receipts.

Controlled differential tests use pinned @screeps/engine 4.3.2 and @screeps/common 2.16.1 through the existing processors harness. They compare default and explicit spawn debits, atomic insufficient-stock refusal, and partial native transfers. A separate case demonstrates why reservation-aware admission must refuse a native debit that would consume reserved stock. These are processor comparisons, not a full server lifecycle or economic return claim.

Checks: 24 targeted funding/household/structure tests; 11 processor comparisons including existing maintenance cases; smoke 76 tests across 15 files. Type checking, lint, architectural boundaries and Lizard pass (937 production / 797 test files, zero violations). Bundle loads without Node globals. The final reordered-input restore assertion is checked with the targeted suite before commit.

Next: connect physical birth debits and explicitly addressed household transfers to funding, cross-check event histories against paid births and delivered cargo, and advance project/planning checkpoint versions before point-aware input can be persisted. Aggregate project forecasts remain explicitly aggregate until that integration is complete. Production queue/reservation ownership and migration rollback gates remain required.
