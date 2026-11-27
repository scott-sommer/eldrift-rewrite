# Private paid hauling forecast state

ED-29 runtime source: `f8afb85fd6790b829b78246045635d6752738d11`.

## Ownership and behavior

The paid courier observer now retains the full task record, including retry count, wake and expiry clocks, phase and original payload. The existing request progress summary remains available for physical continuation.

`app/remotes/startup/hauling-state` builds a detached, bounded private state port from the coherent home packet. It receives no live owner port. Each task and journal uses its existing owner schema; requests share one home queue and quantity claims share one ledger. Selected and external bookings remain distinct inputs to the same reservation policy. Duplicate workers and conflicting request/receipt identities refuse; shared request receipts are merged once.

A reflected delivery is posted to the private opening receipt set before any frame advances. Its bank energy already belongs to opening stock. The private journal retains the attempt and acknowledgement state, with the verified observed result, so the existing hauling behavior can reconcile reservations and acknowledge it idempotently. Withdrawals retain outstanding request quantity. These are state seeds, not new income events or authority to act in the game.

## Verification

- Targeted observation/opening/state/home tests: 15 tests in four files passed (484 ms), followed by the additional shared receipt/idempotency case: final state selection five tests passed (341 ms).
- State tests run the real hauling behavior and task runner: completion, partial delivery, external capacity competition, pickup stock release, sleeping, empty-source termination and expiry. Input mutation checks and detached reads preserve the observed snapshot.
- Fixed smoke: 76 tests/15 files passed (543 ms). Full units remain reserved for milestone/ticket closure.
- Type checking, lint, architecture boundaries, Lizard (1136 production/950 test files; zero violations), and packaged bundle passed.
- Supported 1000-tick native pipeline `engine-NhVkTi` passed on clean published source above. At ticks150..155, each of two couriers' full task, effective remaining quantity and shared claims matched the private seed. Tick153 includes a reflected56-energy pickup. Tick155 includes a reflected56-energy delivery: remaining0 with exactly one opening receipt and an unacknowledged observed private journal. Existing exact settlement-calendar and productive movement assertions remained enabled.

Raw evidence: `evidence/startup-paid-hauling-state.json` and its compressed archive.

## Remaining integration

This does not advance the private state through a native-calibrated future home forecast. Next, connect actual task admission/execution to the single physical movement frame and shared source inventory/sink/spawn/cash timeline. Opening receipt sets are baselines: future settlement income must exclude them. Preserve completion-frame delay before new recruitment, no-minimum collection for an assigned container task, request and task expiry, booking renewal while travelling, and source attribution. Add bounded checkpoint/resume for private state alongside the home project before financial use.

Two-source exact receipt calibration, full productive horizon, cleanup/retirement and alternate-sink paths, and strict5ms qualification remain open. No live deployment or financial admission was enabled.
