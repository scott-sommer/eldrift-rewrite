# Incremental remote portfolio management

ED-29 remains in progress. The new management cycle connects native source assessment to portfolio selection and scoped exclusive leases. Its injected candidate/policy boundary is reusable; automatic graph discovery, production configuration, recruitment/replacement, actor execution and main-loop registration remain separate pending work. This is not full remote capability parity.

## Responsibilities

features/remotes/management owns the persistent scan cursor, retained quotes and current managed generations. Room inventory reads and expensive source assessments have separate per-call budgets. Policy identity changes and scan deadlines restart the draft; tick advancement alone does not. Completed inventory/source work survives global reset. CPU admission failure leaves the current source pending. A partial scan never publishes a partial assignment batch. A complete scan can reuse and reprice retained quotes until its reassessment interval expires.

app/remotes/management supplies native facts and current admission. Source assessment retains the body/economic policy actually measured. Before lease publication, current admission checks home ownership/body affordability, unchanged source coordinates/capacity, controller ownership/reservation, and known-safe freshness/threat policy for every measured travel room. Cached economics cannot override current admission. Current policy may select a full room, a repriced fragment or nothing. After threat recovery, fresh admission can reacquire a new fenced generation.

## Ownership and concurrency

An optional room scope extends the existing assignment batch API. Unmentioned same-home leases retain their exact expiry, payload and generation. Existing callers retain full-home reconciliation when scope is omitted. Management tracks only the generations it created: a manually created lease or another generation remains outside automatic ownership. A new scan/policy preserves that ownership bookkeeping. Selected/removed managed rooms form the next scoped batch, while other homes remain protected by existing exclusive assignment CAS.

The scan store uses revision and clock checks. Before assignment publication, management checks its scan revision again; the assignment store separately checks the captured empire assignment revision. Inventory membership changes invalidate the scan rather than publishing a partial certificate. Read-only admission/assessment ports remain synchronous. No generic service locator, second task system, movement implementation or spawn allocator was introduced.

## Bounds and remaining integration

A scan admits at most 64 candidate rooms and 128 source identities, with at most 16 sources in each room. Reports, quotes and job identity have explicit schema bounds. Scan and lease durations validate together so ordinary bounded reassessment fits within the requested lease lifetime. Long CPU starvation expires/suspends work rather than blindly extending stale leases. A native path search cannot be preempted within the engine call; its operation cap and between-leg CPU admission remain explicit. Production budget/pressure tuning and progress under very short CPU budgets remain ED-29/43 work.

The candidate list and commitments are explicit input. Keeper support costs can be represented by existing atomic portfolio offers, but keeper tactics/mineral missions are not activated by this manager. Reservation requests do not establish that a production reserver body is affordable; the upcoming population policy must select/price a feasible reserver and choose reservation admission accordingly. Manual/operator Mine/Reserve/Outpost translation remains ED-39/44.

## Validation scope

The 56-tick native probe measures two actual sources at differing travel distances, with one source assessment per call and six resets (2/8/16/27/35/46). It exercises whole-room and fragment selection, zero capacity, hostile pause/recovery, loss/restoration of actual home spawn capacity, foreign reservation and stale lost vision. A separate manual lease retains exact expiry and expires at its original tick 24. An unrelated state sentinel is unchanged. This probe exercises assessment/selection/lease management; it does not spawn or operate remote workers, prove delivered income, or establish production CPU/Memory/soak acceptance. Trace rows themselves add fixture Memory/CPU overhead.

Committed-source checks and evidence are recorded after final validation. The preceding broad clean native baseline is the 200-case suite at 9a55fec; the new management case increases registration to 202, and full-202 qualification remains unexecuted until explicitly recorded.
