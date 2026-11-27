# Shared hauling inventory and next-frame effects

## Responsibilities

`capabilities/resources/energy-inventory` owns one canonical map of physical energy inventories. It supports mixed-resource usage and energy-compartment capacity without confusing total used capacity with energy cargo. It has bounded store/intent counts, detached inputs and reads, explicit frame chronology, and complete settlement order validation. Invalid finish requests leave the opening stores untouched.

During actor service, queued intents do not change opening stock or free capacity. The caller supplies the complete engine processing order to finish the frame; that order is not inferred from actor/admission order. Effects carry separate issue and settlement ticks and are available to observations only in the next frame. The component clips withdrawals to remaining source stock and receiving capacity; transfers require the full requested sender amount before receiver clipping, matching the inspected pinned processor branches. Mixed-resource contents remain accounted for as energy moves.

`app/remotes/startup/hauling-state/transfer.ts` connects this inventory to the existing transfer step, journal and ordered private task service. Physical location/range/target acceptance and approach remain injected world responsibilities. A shared world action arbiter is required: the transfer adapter cannot create a separate permission budget. The journal is written before issuing a queued intent. No live state port or native creep action is supplied. Unseen or inactive destination capacity cannot authorize delivery.

The next frame exposes actual positive transfer events to the existing settlement owner. A50-energy attempt clipped to45 becomes a45-energy receipt, retaining5 physical cargo even when the full destination causes task failure. Withdrawals create no delivery receipts. An unfinished request may collect another load without inventing a full trip-completion turnaround; destination reservations also constrain that collection amount. Opening reflected receipts remain the seed baseline and are not recreated as physical effects.

The frozen script observation boundary follows [Screeps simultaneous-action documentation](https://docs.screeps.com/simultaneous-actions.html). Exact settlement branches are checked against the locally pinned `@screeps/engine`4.3.2 processors in `tools/processors/hauling.check.mjs`.

## Evidence

-19 relevant tests across inventory/transfer/service/state files passed in389ms. They exercise the actual private task runner and journal, clipped and multi-load settlement, mixed stores, energy conservation, action-owner contention, approach without transfer, explicit settlement order, and detached/atomic frame behavior.
-4 focused pinned-processor comparisons passed in197ms: shared withdrawals with an intervening deposit under two orders, mixed-resource receiving-capacity clipping, and insufficient sender stock. These invoke upstream processor functions with fixture scopes; they do not run a complete engine tick or establish its global processing order.
-Fixed smoke76 tests/15 files passed in565ms. Type checking, lint, architecture boundaries, Lizard (1141 production/953 test files; zero violations) and packaged bundle passed. Full units remain reserved for milestone/ticket closure.

Commands: `npx vitest run test/capabilities/energy-inventory.test.ts test/app/remotes/paid-hauling-transfer.test.ts test/app/remotes/paid-hauling-service.test.ts test/app/remotes/paid-hauling-state.test.ts`; `npx vitest run --config tools/processors/vitest.config.mjs tools/processors/hauling.check.mjs`; `npm run quality`; `npm run test:smoke`; `npm run check:bundle`.

## Remaining gates

No new complete native scenario qualification is claimed for these components. The concrete world must seed every physical body/store once using observed capacities, handle visibility/acceptance and movement, supply actual processing order and other actors' effects, and integrate source mining/maintenance, births and expiry. Connect that world to the single home sink/spawn/cash timeline, retain source-attributed receipts and exclude opening baselines from future income, then add bounded checkpoint/resume and compare full future calendars against native execution. Shared-source, full horizon, alternate-sink/cleanup/retirement and strict5ms gates remain open. No financial admission or deployment was enabled.
