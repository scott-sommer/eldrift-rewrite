# Ordered natural expiry and tombstone material (ED-29)

The reusable energy frame now models declared ordinary owned-body expiry, tombstone stock/countdown, clipped withdrawals and final material release in the same explicit post-action object order as source/ground/container ticks. Live actor observations remain frozen while intents queue. Each live lifecycle body requires an explicitly supplied final pose at settlement; movement is not silently assumed stationary. A missing pose or unsupported mixed expiry cargo fails atomically.

## Material and identity

At its last action frame a body can still harvest, build, repair or transfer. Object processing then deletes its live inventory and retains a bounded death record. Native corpse salvage plus remaining energy first fills a live container under the final pose; the rest belongs to a tombstone with a forecast-local identity. Body material is computed by the portable corpse helper from the engine's lifetime, corpse rate, per-part cap and boost costs, with each resource floored after summation. Damaged parts still contribute corpse material. The ordinary native expiry adapter computes the one-life-tick profile and refuses nonenergy salvage that lacks a physical model.

A tombstone exposes withdrawable stock through the common withdraw intent, not receiving capacity, source production or bank cash. It is absent from live actor inventories. Multiple scavengers consume the same stock in processor order and clip to actual CARRY headroom. On its expiry, remaining material fills a currently live container and then merges into ground energy. New piles created during object processing are outside that frame's fixed iteration and first decay next frame.

Object order matters. A death before due container destruction can put cargo into that container's subsequent spill; container destruction first instead leaves that cargo in the tombstone. New tombstones are absent from the native death frame's object iteration; their visible remaining clock is initialized from absolute native decay time, not by processing them twice.

## Persistence and bounds

Declared bodies and tombstones are each bounded at128. Live/dead/expired phases, distinct birth identities, source/container/site collisions, body/tombstone bindings, safe clocks and ordinary expiry timing are checked. JSON continuation retains tombstone stock, released-material evidence and countdown without repeating salvage. A previous-frame action remains a valid witness when its body or tombstone disappeared in that same object phase. Identity-only zero-stock witness records never enter live inventories. Dead actors and expired tombstones cannot issue new transfers or supply new stock.

## Evidence

- Focused frame tests cover natural cargo retention/release/next-frame ground decay, immediate JSON continuation, a last-frame bank transfer, clipped tombstone withdrawal on its expiration frame, missing-pose/mixed-cargo atomic refusal, corrupt clocks and last harvest/repair/build witnesses.
- Pinned engine4.3.2 processor comparisons:9 tests/1 file656ms. Six scenarios run actual creep tick/death, container tick, tombstone tick, withdrawal and ground decay, with immediate JSON continuation. They include empty cargo, a50-CLAIM natural corpse, partial standing-container capacity and both container/death orders. The movement module is explicitly stubbed stationary; these comparisons do not qualify collision resolution or movement prediction.
- Three additional corpse comparisons exercise the per-part125 energy cap and resource flooring across boosted/damaged parts against `_die`, including nonenergy material arithmetic. Nonenergy physical storage is not implemented by the energy frame.
- Final relevant units:41 tests/7 files871ms. Final pinned expiry/container/transfer/construction comparison selection:25 tests/4 files521ms. Fixed smoke:76 tests/15 files660ms (unchanged selection). Typecheck, lint, architecture boundaries and pinned Lizard pass (1212 production/982 test files; zero violations). CommonJS/no-Node-globals bundle check passes. Full units/closure CI and a new full native scenario were not run for this incremental physical mechanism; application activation remains explicitly gated below.

## Whole-home integration and remaining gates

Ordinary whole-home integration is now implemented separately; see [whole-home expiry](startup-home-expiry.md) for native profile/control capture, accepted poses, postmortem receipt/retirement order, dead registry removal, checkpoint validation and evidence. Unprofiled or spawning transitions still retain an explicit guard. Native spawning, prospective births, combat/damage, boosted nonenergy salvage, multi-resource cargo and recycling/suicide remain distinct transitions requiring qualification. The complete current environment, household/outside controllers and replacement ownership are not established by ordinary corpse physics.

The full native future financial/dispatch calendar and ED-29/RC gates remain open. Physical corpse/tombstone energy is not permission to spend, a free recovery action or confirmed income. No live deployment.
