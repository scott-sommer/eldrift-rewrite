# Configured boost-lab roles and preload

ED-36 source `312792f` restores the dedicated compound-role/preload mechanism from legacy `labV2.setupLabs` and mineral-courier policy through existing industry and hauling owners. Implementation is `7246e4a`; subsequent fixture-only commits add reloads and retain lab identity through removal. Explicit lab selection is implemented here; nearest-spawn automatic allocation, bulk helpers and legacy console aliases remain separate work.

## Configuration

```js
require('main').industry.labs.configure('W0N1', {
  labBoostRoles: [{ lab: 'owned-lab-id', resource: 'XGH2O', mineral: 60, energy: 40 }]
});
```

`labBoostRoles` defaults to an empty array. It accepts at most ten distinct owned lab IDs with exact compound names, mineral targets 0–3000 and energy targets 0–2000. Targets are minimum buffer levels, not caps: lowering a target does not discard valid excess stock. Operator input validates actual boost compounds and current lab ownership before writing. Pure configuration validation checks record shape/bounds/uniqueness and snapshots/freeze-copies records; native supply also refuses unsupported boost compounds if configuration was supplied through another path.

The role is effective independently of reaction enablement. Proactive execution uses the normal background scheduler; logistics and an ordinary courier must be enabled to move stock. It clears incompatible minerals to an owned bank, refills the assigned compound and then energy through the shared service request, task, quantity-claim and next-tick transfer confirmation path. Existing `labTransportBatch`, `labTransportPriority`, `labSupplyReserve`, `storageEnergyReserve` and bank free-space policies apply. No native transfer or boost is invoked directly by role provisioning.

## Responsibility and handoff

Configured roles immediately exclude those IDs from reaction topology and local production inventory. The persistent industry owner records current bindings in `industry-boost-labs/<home>` schema 1. Retiring bindings remain excluded until their admitted stock service and any actual boost pin settle. New role work fences unclaimed reaction services for its lab and waits for claimed reaction cargo before starting preload. A role-held lab can be selected only for its assigned compound; generic unbound labs remain reusable.

Changing compound or removing a role cancels only unclaimed preload work. Claimed cargo retains its request/task/receipt owner. Binding replacement waits for that service and pinned boost work to finish; old and newly desired compound requests cannot take over the transitioning lab. An already pinned per-creep boost can finish under its original exact request. While pinned, proactive role supply stops generating competing work. After the actual boost and cleanup, it refills the buffer for subsequent actors.

There are at most ten persisted bindings. If ten old bindings are retiring while ten new IDs are desired, desired IDs are already excluded from reactions but proactive admission waits for a slot rather than dropping an old identity. Removing a role releases its assignment after handoff; physical stock is retained or recovered by ordinary subsequent lab policy, not destroyed or silently removed. Visibility loss does not clear role state.

Actor selection and worker/operator funding now respect compound-role access. During transition, pending old/new role disagreement refuses new incompatible claims. Lab-local stock and allowed future compounds are filtered accordingly; transferable banks are still shared and actual kit admission remains the boost executor's responsibility. Funding remains a conservative snapshot, including the pre-existing single matching lab per compound model, not global optimal matching or exclusive stock promises through spawn duration.

## Qualification

Local full checks pass 1,926 unit cases / 473 files in 12.90 s; focused + smoke 24 / 6 files in 0.377 s; processor comparisons 4 / 0.223 s; suite-report check 1 / 0.1259456 s; bundle and type/lint/boundary checks pass. Pinned Lizard 1.22.2 reports 882 production / 725 test files with zero violations. These local full checks precede fixture-only reload/identity verification additions; exact final [CI 44817068492](https://github.com/scott-sommer/eldrift-rewrite/actions/runs/44817068492) passes Windows/Linux and all six required checks.

Eleven clean final-source native scenarios pass in 78.023 s: configured preload/refill, compound switch, removal, lab operator pause/switch, lab chain, boost operator, reaction coexistence, automatic worker boost, contracted birth, Upgrade Room and packaged smoke. Each new role case runs 320 ticks with module reloads at 8, 12, 31 and 181.

| New role scenario | Actual observations |
| --- | --- |
| Preload, boost, refill | Dirty K is banked; 60 XGH2O / 40 energy is observed at tick 31 before actor admission. Two actual WORK boosts are confirmed at 44. The controller refills to 60/40; final bank XGH2O is zero from 120 initial stock, with 60 consumed by the real boost. |
| Switch during cargo | At tick 9 desired ZO differs from retained XGH2O binding while the courier carries 20 XGH2O. It settles/retires through normal ownership. Final role lab has 30 ZO / 20 energy, with all 120 XGH2O back in bank. |
| Remove during cargo | The same 20-unit in-flight XGH2O handoff retains its old binding after desired roles become empty. Final bindings are empty and all 120 XGH2O is recovered. The lab can join reaction topology only after retirement completes. |

All three bank 10 OH through ordinary reactions alongside the role lifecycle and recover 10 initial incompatible K. End courier cargo/tasks and live quantity claims are empty. Verification retains the actual role lab ID across removal and checks every active/retiring row for reaction exclusion. Fixture ticks are observations rather than travel promises; broader destruction, visibility and repeated-reconfiguration pressure cases remain to qualify.

Unit tests additionally cover future-schema refusal, bounded ten-binding replacement, actor resource restrictions, deep configuration snapshots, operator rejection and worker funding admission. Full source/raw/row hashes, reset witnesses and CI step outcomes are in [boost-lab-roles.json](evidence/boost-lab-roles.json). Registry 268 was not fully rerun. This is not aggregate CPU/memory/soak or cross-version rollback qualification.

## Compatibility and remaining scope

New configuration key: `labBoostRoles`. New namespace: `industry-boost-labs/<home>` version 1, owner `industry`. Default absence creates no role namespace. Future role versions refuse; existing operator, reaction, production, boost, logistics, task and quantity schema versions are unchanged.

Before pre-role rollback, stop role producers, set desired roles empty under current code, let admitted role transfers and pinned boosts settle, verify current bindings and active role services/claims are empty, and preserve tasks/journals/receipts. Remove the new configured key before earlier configuration validation. Older bots ignore this namespace and would lose retiring-role exclusions, so its presence is not a downgrade refusal gate. Full migration/rollback rehearsal remains ED-44 work.

Remaining ED-36/ED-39 obligations include automatic role allocation strategy (the old nearest-spawn choice), bulk operations/compatibility aliases, specialists, optimized boosted bodies, empire resource/production allocation and broader depletion/visibility/lifecycle evidence. Explicit roles and preload do not establish full legacy lab/console/resource-manager parity.


Subsequent increment: [automatic boost-lab allocation](boost-lab-allocation.md) adds bounded topology-preserving preview/apply operations with nearest-spawn scoring. Bulk/compatibility and continuous empire policy obligations remain open.
