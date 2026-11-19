# Buffered reservation quotation

Implementation 14cf721 provides a reservation quote independently from source travel and source production facts. Native management still leaves automatic reservation disabled. This component does not recruit or reserve a controller.

## Mechanics and selection

The selective legacy recipe retains balanced CLAIM/MOVE pairs and an eight-pair cap. Automatic quoting requires at least two CLAIM parts; it does not produce a MOVE-only or single-CLAIM fallback. The feature policy chooses the lowest recurring-cost body meeting the requested useful buffer and recovery coverage, rather than spending the full body budget by default.

Pricing uses CLAIM lifetime, separately measured outbound/return travel, retirement reserve and scheduling overlap through shared service timing. Useful buffer accounts for controller aging at endTime-1. Required coverage includes configured minimum buffer plus spawn/outbound/margin recovery. One CLAIM has zero net buffer growth and is refused. Body energy and spawn load use the actual replacement interval. No controller capacity or source inventory is invented by this calculation.

The quote supplies a single room commitment (one workforce slot and one energy/spawn charge). Portfolio tests apply it to a two-source room with zero per-source reservation charge, proving the cost is counted once while observed source capacity stays 1500. Commit 6bcfa0e adds validated per-room quoted or explicitly unreserved decisions to management. Ordinary automatic candidate generation and population remain disabled.

## Native quote and persistence

`createNativeReservationQuote` accepts home/room/tick, body budget, minimum buffer, replacement margin and known-safe traversal. It checks current home/target authority and actual body affordability by capacity, then measures controller approach and return through the shared native static leg service. Balanced CLAIM/MOVE counts share a tested terrain-cost profile. Every new body class needs its own measurement policy.

Completed legs survive CPU deferral and module reset in one bounded `remoteReserveTravel/<home>` record (version 1, owner remotes, at most two legs). Identity includes controller, endpoints, route, measured body profile and topology. Geometry/topology changes discard only controller measurements; source progress remains separate. Cache writes retain revision/clock fencing and reject corrupt legs. Pricing-only changes reuse valid travel. The common static travel-leg type and narrower measurement input preserve existing source behavior without changing its wire schema.

## Evidence

Full units: 1418 tests / 386 files / 10.97s; type/lint/boundaries/bundle passed, Lizard684 production /561 test files, zero violations. Clean native quote, source assessment, management and existing reservation-actuator regressions pass. Exact quote rows/provenance and fixture diagnostic are in evidence/reservation-quote-native.json.

The eight-tick quote fixture measures 5 outbound /4 return ticks near the home and 45 /44 after a controlled controller-position change. The selected two-pair body costs1300. Near replacement interval540 gives energy rate1300/540; far interval460 gives1300/460. Threat ticks3/4 defer despite cached measurements; clear/fresh facts restore quotation. Two reloads, unchanged source-progress/unrelated state, no native reservation and unchanged1300 spawn energy are asserted.

Useful-buffer values remain predictions; this short scenario does not execute reservation or qualify missed ticks/natural replacement. The older actuator regression includes controlled lifetime/energy changes. The full native registration now has217 cases; it was not rerun for this isolated quotation increment. The prior clean216-case construction milestone remains the broader baseline.

## Remaining integration

The per-room management seam is implemented and qualified below. Add scoped generation-owned population, final spawn admission and actor service to shared workforce limits. Stage actual extraction and home redistribution so a1300 reserver cannot consume all miner startup funding. Then qualify natural buffered handoff, missed ticks, source regeneration, threat/vision/home changes, queue cleanup, economic acceptance/rejection and startup/payback without mid-run funding injection. ED-29 remains open.

## Per-room management qualification

Implementation 6bcfa0e adds optional per-candidate reservation decisions: omitted retains legacy global behavior, null explicitly disables reservation, and a validated quote enables the selected controller independently of the global flag. Explicit decisions remove source-level reservation fees. The room offer stores the original commitment and adds the complete quoted charge once; validation rejects missing/doubled fees, changed bodies/economics and incorrect target/route provenance.

Commit requires fresh matching controller observations and an injected native re-quote with the same body, pricing policy, route identity and economics. CPU refusal or a missing live-admission port cannot publish a quoted reservation. Quote observation time remains stable across a scan; deliberate refresh starts a new policy scan. This prevents a freshly generated timestamp from restarting every scan.

Management state advances to schema3. Valid old schema2 offers are invalidated because they lack per-room provenance; lease generation, clock and revision survive. Schema1 passes through the existing loaded-travel migration first. Corrupt old records and undeclared quote fields are rejected. Pending scans preserve existing leases without renewal; actors remain responsible for current safety on every action.

The clean 28-tick native scenario supplies two candidate rooms and passive witnesses. East has two sources and one quoted reservation; North has one source and an explicit unreserved decision, despite the global flag being true. It upgrades a schema2 record, reloads three times, refuses the East quote while controller geometry changes, then recovers after restoration. Source capacity stays1500, per-source fees stay zero, spawn energy stays1300, no native reservation executes, and the unrelated manual lease/state stay unchanged. This is management qualification, not population or natural buffering proof.

Full units:1427 tests /389 files /10.10s. Quality, packaged bundle and Lizard690 production /566 test files pass with zero violations. The clean218-case full native suite passed in 1287.44 seconds. Exact rows, clean commit provenance and limitations are in evidence/room-reservation-native.json; all per-case outcomes/digests are in evidence/room-reservation-engine-suite.json. Earlier quote-only evidence above remains historical.

## Population authority foundation

The next increment adds generation-scoped remote-reservation owners and a pure population-plan binding. Only a current managed lease generation with a matching controller and a valid, fresh priced offer produces a plan. Expired/manual/unreserved leases and corrupt or stale quotes produce no automatic population. Workforce family recognition now includes reservers in live and same-tick ceilings, and construction budgeting includes pending reserver requests before they appear in the native roster. Malformed remote-family owners are refused at shared admission and conservatively consume roster capacity.

Verification:1432 tests /390 files /10.24s, type/lint/boundaries/bundle passed, Lizard693 production /567 test files with zero violations. Focused development native --remote-road-auto and --remote-fleet-budget regressions passed on the modified worktree. The clean218-case management milestone above remains the last full-suite qualification. The authority foundation does not register recruitment or a new actor, enable reservation configuration, or qualify actual buffered reserve service; those remain the next integration work.
