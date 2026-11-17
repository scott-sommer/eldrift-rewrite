# ED-25 acceptance audit

Audit baseline: db270a0. Production stamp planning, automatic comparison and
configuration are implemented. Default-budget completion and broad native
regression pass. ED-25 acceptance is qualified by the final clean168-case native suite after the cold-replay fix.

| Requirement | Evidence inspected | Assessment |
| --- | --- | --- |
| Irregular staged room or explained failure | stamp-irregular.test.ts; native irregular-stamp-room, full counts/shared validation/real routing | Four outcrops around locked storage qualify; not universal solvability |
| Locks/manual entries and corridors | stamp-placement tests and native observed spawn/storage preservation | Evidenced |
| Labs, egress, RCL capacity, common score | catalog transform/RCL tests, shared final validator, native complete-room cases | Evidenced |
| Determinism and reset/resume | serialized incremental/backtracking tests, elevated native reloads, early default reloads6/101 | Late composition/routing/scoring resets now pass; final full168-case suite passed |
| Rejection preserves prior plan | native stamp-failure, complete plan-envelope equality after exhaustion and reload | Evidenced |
| CPU bounded | finite domain/attempt/search limits, cooperative guard; default case commits at790 | Default and late-reset completion evidenced; allowance is not a hard millisecond ceiling |
| Extension contract and example | layout-strategies.md and executable blueprint strategy example | Evidenced at evaluator boundary; example is not a full production colony strategy |
| Free-form future work | ED-45 | Separately tracked post-release enhancement |

Current full unit963 tests/278 files passed7.25s. Baseline native167 checks passed587.88s
against clean db270a0 for every scenario. The default-budget case now also
executes shared full inventory assertions. Evidence and per-case provenance:
docs/evidence/stamp-default-engine-suite.json. Audit found only the expected
planning-cpu termination, injected-error sentinels, injected-timeout failure,
and single Art repair-suspension diagnostic in each Art scenario.

CPU qualification must distinguish cooperative finite work from a hard ceiling:
anchor preparation, validation and persistence include synchronous work. ED-43
retains broader CPU/memory/soak qualification. Cold composition replay now retains
only validated branch prefixes across slices. Native phase-triggered resets
qualify deep composition, partial road construction and partial service scoring.
Loss of heap state rebuilds these accelerators; their contents are never trusted
from persistent memory.

The first complete composition is routed and validated. If it fails, the outer
hub candidate is rejected; alternate complete compositions at the same hub are
not enumerated. This bounds failure and limits solution coverage.

Historical implementation measurements follow; newer evidence above supersedes
earlier statements that default-budget completion or full regression was missing.

## Measured CPU evidence

docs/evidence/stamp-native-cpu.json preserves whole-bot CPU aggregates and
bundle/engine provenance from the completed functional runs. Through commitment,
explicit stamp-room mean111.42/max155, automatic room mean73.23/max145,
and irregular room mean110.30/max145. These include telemetry, persistence and
other main-loop work; they are not isolated planner timings. The failure scenario
window through100 includes idle ticks and is not comparable as active-search cost.

Inspection found prepareStampComposition calls stampAnchors separately for every
non-hub stamp; each call allocates and sorts the full interior room grid. The
adapter repeats this preparation on each advance before composeStamps checks its
guard. This is a concrete optimization target, not a measured attribution of the
whole-bot CPU above. Preserve deterministic anchor order and preservation-derived
priority when optimizing, and measure default-budget progress after the change.

## Lazy anchor traversal

Replaced repeated full-grid allocation/sorting with Chebyshev ring traversal in
distance then row-major order, stopping once enough anchors are collected.
Preservation-derived anchors retain their existing sorted precedence.
Exact equivalence tests cover boundary/interior hubs and limits1/9/200/2500;
existing transformed-lock and full/irregular composition regressions pass.

Native engine-NdtgIg committed at14 but correctly failed the old assertion that
planning remains incomplete at reload21. The explicit stamp-room family now
reloads at6 and101; automatic comparison and standalone draft retain their
existing schedules. Final engine-UBG2PV passed400 ticks, committed at15,
preserved full capacity and exact previous cost breakdown, errors/messages empty.
The earlier engine-3UIoa8 committed at39. Through-commit whole-bot samples in the
new run:14 samples, mean108.5/max137/sum1519 CPU. Elevated allowance remains100;
faster completion is not proof of a lower per-tick ceiling. Host timing and
reload schedule differ, so this is functional progress with indicative timing,
not an isolated benchmark.

Full unit suite938/267 files passed8.22s; targeted seven tests passed1.11s.
Quality446 production/397 test files, zero violations. The full166-case native
baseline predates this optimization; default-budget and broader native regression
remain to qualify before closing the CPU work.

## Default-budget diagnostic: not yet qualified

The opt-in --stamp-budget scenario uses all resolved default settings, changing
only planningEnabled=true and layoutStrategy=stamps. In particular CPU5,
candidate attempts100, evaluation steps1, searches1, outer anchors36 and inner
stamp defaults remain unchanged. It uses the actual observed-room main loop and
reloads6/101. Its assertion requires commitment; it is deliberately not added
to the passing regression suite until the requirement is met.

400-tick runs engine-7EOOx6 and engine-DTT1nx failed to commit, reaching2087/2638
attempts and12/13 stamps. A1600-tick run engine-ouWWEZ also failed:3366 attempts,
15 of27 stamps, still drafting. Its50-tick trace shows progress slowing:
attempts3060 at800,3161 at1000,3243 at1200,3276 at1400,3366 at1600.
This demonstrates inadequate completion under the tested defaults, not an
absolute permanent stall or isolated proof of which operation dominates CPU.

Preparation repeats per advance; composeStamps reconstructs all chosen placements
with legality/capacity checks before exploring the next attempt. These are the
next optimization targets. Do not increase defaults or weaken the commitment
assertion to report this as a pass. Preserve bounded work and reset correctness
when retaining reconstructible caches or making replay incremental.
Quality passed446 production/398 test files, zero violations. Native diagnostic
failure is an open acceptance finding, not a successful engine test.

## Reconstructible branch cache boundary

createStampReplayCache provides a caller-owned single-branch heap cache keyed by
the validated composition signature and exact choices. composeStamps accepts it
optionally, checks restored checkpoint shape/identity first, and avoids replaying
a matching branch. Both cache writes and reads detach all plain metadata.
Misses and runtime resets use the existing validated reconstruction path; guards
can still defer work. No persisted schema changes or global cache were introduced.

Tests prove matching branches skip placement validation, returned-output mutation
cannot poison later reads, changed signatures/choices miss, replacing the sole
entry evicts the previous branch, and a fresh cache reconstructs identical output.
Nine targeted composition/cache/smoke tests passed255ms. Quality447 production/
399 test files, zero violations. This cache is not yet connected to native room
lifecycle; no default-budget improvement is claimed until that wiring and engine
measurement are complete. Signature semantics must continue to bind observation,
movement policy and all composition inputs through the caller's revision.

## Native replay-cache ownership

The native planning feature now owns at most32 room caches with least-recently-used
eviction, and injects each cache through work/evaluator/strategy/draft composition.
It persists across ordinary ticks but not code reloads. No durable state depends
on it. Unit coverage checks room isolation/reuse/eviction and fresh ownership.

Unchanged default-budget diagnostic engine-IBnvgz reached all27 stamps and9131
attempts by1050, compared with15 stamps/3366 attempts at1600 previously.
It still FAILED commitment: road connections remained0 from1050 through1600.
The next bottleneck is preparation between composition and routing; do not
claim default-budget completion. Trace/provenance saved in
docs/evidence/stamp-cached-budget.json.

Native --stamp-failure engine-X7loeS passed: natural commitment, policy-change
search-limit rejection, reload and identical retained plan. Full unit suite
941 tests/269 files passed8.31s. Quality448 production/400 test files, zero
violations. Full native aggregate has not been rerun for cache wiring.

## Retained room assessment

Bounded native room caches now also retain the existing immutable single-observation
assessment cache. The shared draft and infrastructure callers receive that same
provider across ticks; changed observations and room eviction recompute assessment.
Tests verify same-observation reuse, changed-constraint invalidation and eviction.
Full unit942/269 files passed9.67s; quality448 production/400 test files passed.

This did NOT resolve default-budget routing: engine-aId0pQ reached27 stamps but
still had zero connections at1600 and failed its commitment assertion. Earlier
engine-JOmry2 hit the60-second harness deadline at1599; the opt-in1600-tick
diagnostic now has90 seconds of wall time. Gameplay budgets remain unchanged.
Next isolate/reuse infrastructure attachment and route-preparation products;
assessment reuse alone is not claimed as a demonstrated native speed improvement.

## Infrastructure attachment reuse

A caller-owned single-result infrastructure cache now reuses identical placement,
storage, observation and capacity inputs, returning detached plain results.
It lives within the existing32-room bound and rebuilds after eviction/reload.
Tests verify reuse, result isolation, changed-constraint invalidation and cold
reconstruction equivalence. This adds no persistent schema.

Native default-budget run engine-1UztOh still FAILED: composition completed by800,
but zero roads through1600. Removing repeated attachment alone is insufficient;
route preparation and checkpoint work must be investigated next. Variation in
composition timing is not attributed to this downstream cache.
Full unit943/270 files passed8.43s; quality449 production/401 test files passes.
No default-budget completion or full native regression claim is made.

## Exact framed checkpoint identities

Candidate, stamp composition, draft and road-network identities now frame ordered
strings by their lengths rather than repeatedly JSON-escaping existing identity
strings. The representation remains exact (not hashed); tests cover empty fields,
boundary ambiguity, quotes/backslashes, surrogate pairs and linear nested growth.
Native policy revision advances to native-planning-v2:legacy-perimeter-v1 so
in-progress old-format requests restart rather than resuming stale checkpoints.
Committed plans remain retained until validated replacement.

Full unit945/271 files passed10.03s; quality450 production/402 test files passed.
Native retention engine-vMzM5p passed commitment, changed-policy failure and
reload preservation. Default-budget engine-RXyua8 still FAILED with zero road
connections through1600. Final sampled Memory size535356 versus564341 bytes in
the preceding run includes telemetry and is only indicative of aggregate size,
not isolated checkpoint savings. No CPU/completion improvement is claimed.
Further investigation needs direct per-stage timings before another optimization.

## Measured stage costs and retained stamp preparation

Temporary Game.cpu.getUsed stage instrumentation on baseline 8e690bf is recorded
in evidence/stamp-stage-cpu.json (engine-Irrsbp). At tick1400 the feature began at
3.3373 CPU, admission finished at5.8066, strategy began at6.7070, anchors finished
at7.5669, composition restore at8.2948 and the road checkpoint at9.9719.
The interval to the road guard was about6.63ms against the5ms allowance.
Console instrumentation contributes overhead; these are cumulative timestamps,
not an isolated benchmark or a strict production timing guarantee. All temporary
instrumentation was restored before the subsequent implementation and checks.

Stamp preparation now retains one immutable catalog/anchor preparation per room
within the existing32-room cache bound. Exact storage, observation, capacity,
anchor-limit and operator-entry inputs determine reuse. Different inputs evict
the previous preparation; reloads rebuild it. Tests verify mutation protection,
caller-input ownership, invalidation and equivalent cold reconstruction.
Stamp services are grouped into an explicit injected object instead of adding
another positional parameter throughout runtime composition.

Quality passed451 production/403 test files with no violations. Targeted12 tests
and smoke passed; full947 unit tests/272 files passed8.18s.
Default-budget engine-eoDHXu still FAILED its commitment assertion: composition
completed by750, one road connection appeared by850, and that count remained
one through1600. This is not a default-budget completion claim. Repeated
composition restoration/signature creation and admission remain material costs;
further work must reduce or checkpoint setup rather than raise gameplay budgets.
Native retention engine-43mgAP passed: bounded replanning failure at100 retained the committed plan across reload; no runtime errors.

## Default-budget completion after checkpoint and scoring changes

The unchanged default gameplay budgets now complete the observed-room stamp case.
Engine-PbgxLt committed at790, evaluated36 candidates and rejected35 incompatible
locked-storage anchors, over1600 ticks with reloads at6/101. Runtime errors/messages
were empty. Reproducible bundle provenance and aggregate whole-bot measurements
are retained in evidence/stamp-default-completion.json. The scenario is now
registered in the full native suite; its inventory assertions share the elevated
stamp-room verifier. This run predates those additional inventory assertions;
the upcoming suite will execute them.

Changes remove repeated setup rather than increase gameplay allowances:
- Caller-owned weak serialization caches reuse only deeply immutable plain data.
  Mutable children, accessors and non-plain internal-slot objects bypass reuse.
- Unchanged replay drafts are not copied back into their cache on every step.
- Candidate progress version2 carries opaque JSON. Its owner parses and validates
  once at resume; lifecycle stores no longer traverse every nested route/entry.
  Version1 object progress upgrades on save. Size, node/depth and finite-number
  validation remain enforced, including JSON prototype-key and negative-zero tests.
- Score factories, assessment/validation accelerators and detached prepared score
  inputs retain the exact observation/policy scope across ticks. Entry or candidate
  changes invalidate input preparation; live native callbacks remain function ports.
- Score route identities use exact framing to avoid nested escaping. Native policy
  revision3 restarts older requests while retaining committed plans.

Scoring stage evidence (engine-csWzek, temporary instrumentation removed) is in
evidence/stamp-score-cpu.json. At1400, score-input preparation consumed about2.72ms
and restore about1.21ms before these last changes. Intermediate diagnostics reached
88 roads (engine-EVSPOb), scoring (engine-wzNm2J), and four hauling measurements
(engine-GtuGh2) but failed commitment; none is counted as a passing completion.

Final quality455 production/408 test files passed; full960 unit tests/277 files
passed7.54s. Broad native regression and default-budget resets during deep
composition/routing/scoring remain unverified. In particular, cold branch replay
currently reconstructs from the root and may need incremental reconstruction
across ticks when a deep branch cannot fit one normal allowance. ED-25 remains open.
Native bounded-failure retention engine-GEnmLe also passed with no runtime errors/messages; committed plans survived rejected replacement and reload.

## Late cold-reset qualification

Two new tests first failed on the unmodified production baseline: a completed deep
branch could not restore across small CPU slices, and yielding at a completed
attempt cap was misclassified as search exhaustion. Native engine-beQmHp reached
its composition reset but never reached routing/scoring reset triggers by1600;
runtime errors/messages were empty.

Replay now caches only the validated prefix of the exact signature/choice branch.
A later slice resumes that prefix; divergent or shorter branches and changed
signatures miss it. Returned data and choice arrays remain detached. No persisted
draft is trusted and no schema change is required. A full branch awaiting
reconstruction stays pending at the attempt cap instead of being rejected.

Full963 unit tests/278 files passed7.25s; quality455 production/409 test files
passed. Native phase-triggered run engine-qovSfE committed at814 after resets
during composition, routing and scoring. The captured qualification pair then
committed at773 (engine-KV82Td, ordinary reloads6/101) and804 (engine-nzIyh2,
additional phase resets256/561/684). Both evaluated36/rejected35 and retained full
inventory with construction disabled. Their complete physical plans, metadata,
object associations and scores match. Comparison normalizes only timestamps
and run-generated IDs; observed object/constraint geometry remains compared.
Negative controls changing geometry, service cost or object references failed.

All six focused native cases also passed: stamp-draft, stamp-room, auto-stamp-room,
irregular-stamp-room, stamp-failure and planning-room. No runtime errors/messages
occurred in these eight final qualification runs. Embedded provenance, plans,
reset events and traces are in evidence/stamp-late-reset.json.
The full native suite now registers168 cases and compares default/late-reset plans.
Its final clean run after this fix remains pending before ED-25 closes.


## Final acceptance qualification

All168 native checks passed636.46s against clean6b2ae35, including ordinary
default-budget completion, phase-triggered composition/routing/scoring resets,
physical-plan/score comparison, irregular rooms and retained-plan rejection.
Evidence: evidence/stamp-final-engine-suite.json. Only expected intentional
planning timeout, injected failure sentinels and Art suspension diagnostics occur.
Full963 unit tests and quality gates were passed on this production revision.
All ED-25 criteria are evidenced within the fixture and bounded-search scope
described above. Cooperative budgets do not promise a hard per-tick ceiling;
broader CPU/memory/soak qualification remains ED-43. ED-45 retains free-form work.
