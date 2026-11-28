# Scheduled physical mining actors (ED-29)

The whole-home forecast driver now accepts explicit `{ kind: 'miner', name }` operations alongside courier settlement/visits and outside owners. The driver composes `createHomeMiningActors` when the injected environment supplies its mining ports. It validates known names, one visit per frame and the settlement-before-actor phase before beginning effects. Missing configuration, unknown/duplicate names and premature visits refuse the frame. An omitted visit represents omitted actor work; the complete future scheduler must still supply the actual native dispatch/budget schedule.

## Ownership and physical work

The actor roster binds the original paid name/owner, actual native unit, source plan, native WORK profiles and observed physical lifetime. It reads current assignment ownership and generates current source demand on every visit, then delegates renewal/cancellation, task wake/retry/expiry, reservations and work selection to the same remote mining cycle used by native dispatch. It never replays the opening demand indefinitely or renews the assignment owner itself. Withdrawal cancels the original task and retires cargo through the supplied owner; old token expiry cannot manufacture a lease extension.

Build, repair, harvest and handoff use the shared physical frame and action arbiter. Build/repair callbacks are composed in production from captured SDK profiles, with explicit current build permission. Harvest power is captured through the existing native effective mining-rate adapter, including active boosted WORK; paid-template WORK counts are not substituted. The native opening profile remains valid only while the physical body has not undergone an unmodelled damage/boost transition.

`HomeMiningEnvironment` supplies current eligibility/mode, home/route/safety admission, full current station assessment and usable infrastructure, movement/retirement and banking behavior. These ports are mandatory decisions, with no invented safe-room, legal-tile, usable-sink, travel or free-banking defaults. The fixed selected station tile comes from the original paid source plan. Outside movement must still join the common transit frame. Bank mode without its registered hauling behavior throws; the adapter must use the actual banking owner to prepare/settle/interrupt tasks.

## Restore and portability

The existing private state stores all assignment/task/reservation owners. Restore accepts native remote-mine and hauling schemas, then checks each configured actor against its actual registered behaviors, original source-demand identity, home and physical unit. Remote cargo-recovery task identity is now a portable helper shared with native banking, preserving the native boolean `owns` API. Unregistered banking tasks and cross-home/source/unit task substitutions refuse rather than executing under a new owner. Current task generations/deadlines are retained, not reseeded from opening observations.

The mining integration fixture no longer builds its own cycle, physical build/repair callbacks or visit function. It supplies only explicit environment decisions and schedules production miner operations, so existing harvest, construction, repair, depletion, denial, conflict and JSON continuation cases exercise the real driver composition.

## Verification and limits

- Scheduled-control and existing mining/native withdrawal/body capture selection: 23 tests/5 files, 852 ms. Separate two-source/native-banking/native-work-cycle/scheduled-control selection: 17 tests/4 files, 818 ms (overlapping selections).
- Two source actors execute in reverse source-list order, hand off50 each, share the assignment/reservation/task owners, preserve296 total modeled energy and resume all frames/checkpoint identically. No bank cash or courier income is inferred from source handoffs.
- Current lease extension updates the real task token while retaining its wake. Withdrawal prevents opening-demand replay. Invalid schedules, missing native profiles, missing banking behavior and restored cross-home/source tasks refuse.
- SDK profile capture distinguishes active boosted WORK from inactive parts and body templates. Native banking/work-cycle tests guard the extracted identity helper and unchanged boolean contract.
- Final affected selection: 48 tests/9 files, 732 ms. Fixed smoke: 76 tests/15 files, 475 ms, selection unchanged. Final typecheck, lint, boundaries and Lizard pass (1200 production/978 test files; zero violations); the CommonJS/no-Node-globals bundle check passes. Full units and both-OS closure workflow were not run for this incremental checkpoint. Clean native regression evidence follows below.

This is production driver composition, not an installed financial admission forecast or a complete future actor calendar. Actual future station/infrastructure/routing/banking providers, household/outside controllers, source/controller effects, site creation/removal, prospective bodies/damage/TTL and all remaining receipt/calendar/CPU gates are still required. Banking transitions and physical settlement now use the shared native control and real private hauling adapter; see [physical banking](startup-physical-banking.md). Native actors already in bank work at capture, physical expiry and full retirement calendars still need qualification. ED-29 stays open; no live deployment is enabled.

## Clean native regression

`node tools/engine/smoke.cjs --remote-pipeline-configured --external-pipeline-telemetry` passed supported1000 (`engine-IheVCH`) on clean published runtime source `98eb0c046cd8cffb9f1da6d382fbb329d97a01f1`, with no reported errors and existing receipt/route/control assertions retained. Six snapshots150..155 capture effective native harvest power2 for the household worker,8 for the four-WORK miner and0 for haulers. This establishes native profile capture/seeding and extraction regression; it does not run the new private scheduler as an installed native future financial forecast. Local fixture telemetry only.

Raw archive, exact source and hashes: `evidence/startup-scheduled-mining-actors.json`. The complete native future dispatch/environment/banking/household/body calendar remains required before financial admission or ED-29 closure.
