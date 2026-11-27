# Portable transfer booking policy

ED-29 runtime source: `5f632cfbd54ac0f9ea2ac02dae552711ab7dbe9f`.

`capabilities/logistics/booking.ts` now prepares and calculates request, source-stock and shared sink-capacity allocations without storage access. The feature adapter retains ownership of ledger initialization, source-pool release, identity-conflict checks and atomic reservation writes. Quantity claim types and validation live in core; persistence re-exports preserve existing consumers and the unchanged schema.

Expired requests still return before opening storage. Delivery releases the stock pool even if sink capacity cannot authorize a renewed allocation. Allocation order and ledger renewal behavior are preserved.

Validation: 19 relevant reservation/partition tests across four files passed (644 ms); fixed smoke 76 tests/15 files passed (602 ms). Type checking, lint, architecture boundaries, Lizard (1133 production/947 test files, zero violations) and packaged bundle checks passed. Full units were intentionally reserved for milestone/ticket closure.

The supported 1000-tick native pipeline passed on clean published source above: `engine-oDW0yJ`. Existing exact settlement-calendar, productive route execution and coherent home observation assertions remained enabled. Raw evidence is retained through `evidence/startup-booking-extraction.json` and its compressed archive.

This extraction does not establish financial authority or native joined forecasting. Next: seed current task, receipts, journal and owned/external bookings into private forecast state and reuse actual hauling lifecycle. Reflected opening effects must not become future income; completion, empty-source termination, expiry and booking renewal must remain explicit.
