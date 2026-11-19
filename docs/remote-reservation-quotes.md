# Buffered reservation quotation

Implementation 14cf721 provides a reservation quote independently from source travel and source production facts. Native management still leaves automatic reservation disabled. This component does not recruit or reserve a controller.

## Mechanics and selection

The selective legacy recipe retains balanced CLAIM/MOVE pairs and an eight-pair cap. Automatic quoting requires at least two CLAIM parts; it does not produce a MOVE-only or single-CLAIM fallback. The feature policy chooses the lowest recurring-cost body meeting the requested useful buffer and recovery coverage, rather than spending the full body budget by default.

Pricing uses CLAIM lifetime, separately measured outbound/return travel, retirement reserve and scheduling overlap through shared service timing. Useful buffer accounts for controller aging at endTime-1. Required coverage includes configured minimum buffer plus spawn/outbound/margin recovery. One CLAIM has zero net buffer growth and is refused. Body energy and spawn load use the actual replacement interval. No controller capacity or source inventory is invented by this calculation.

The quote supplies a single room commitment (one workforce slot and one energy/spawn charge). Portfolio tests apply it to a two-source room with zero per-source reservation charge, proving the cost is counted once while observed source capacity stays 1500. The managed-room policy seam is still required before using this quote in ordinary selection.

## Native quote and persistence

`createNativeReservationQuote` accepts home/room/tick, body budget, minimum buffer, replacement margin and known-safe traversal. It checks current home/target authority and actual body affordability by capacity, then measures controller approach and return through the shared native static leg service. Balanced CLAIM/MOVE counts share a tested terrain-cost profile. Every new body class needs its own measurement policy.

Completed legs survive CPU deferral and module reset in one bounded `remoteReserveTravel/<home>` record (version 1, owner remotes, at most two legs). Identity includes controller, endpoints, route, measured body profile and topology. Geometry/topology changes discard only controller measurements; source progress remains separate. Cache writes retain revision/clock fencing and reject corrupt legs. Pricing-only changes reuse valid travel. The common static travel-leg type and narrower measurement input preserve existing source behavior without changing its wire schema.

## Evidence

Full units: 1418 tests / 386 files / 10.97s; type/lint/boundaries/bundle passed, Lizard684 production /561 test files, zero violations. Clean native quote, source assessment, management and existing reservation-actuator regressions pass. Exact quote rows/provenance and fixture diagnostic are in evidence/reservation-quote-native.json.

The eight-tick quote fixture measures 5 outbound /4 return ticks near the home and 45 /44 after a controlled controller-position change. The selected two-pair body costs1300. Near replacement interval540 gives energy rate1300/540; far interval460 gives1300/460. Threat ticks3/4 defer despite cached measurements; clear/fresh facts restore quotation. Two reloads, unchanged source-progress/unrelated state, no native reservation and unchanged1300 spawn energy are asserted.

Useful-buffer values remain predictions; this short scenario does not execute reservation or qualify missed ticks/natural replacement. The older actuator regression includes controlled lifetime/energy changes. The full native registration now has217 cases; it was not rerun for this isolated quotation increment. The prior clean216-case construction milestone remains the broader baseline.

## Remaining integration

Introduce a validated per-room reservation decision in management instead of toggling its global flag for every room. Persist/validate selected quotes and migrate/invalidate changed wire schemas deliberately. Add scoped generation-owned population, final spawn admission and actor service to shared workforce limits. Stage actual extraction and home redistribution so a1300 reserver cannot consume all miner startup funding. Then qualify natural buffered handoff, missed ticks, source regeneration, threat/vision/home changes, queue cleanup, economic acceptance/rejection and startup/payback without mid-run funding injection. ED-29 remains open.
