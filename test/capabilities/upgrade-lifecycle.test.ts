import { expect, test } from 'vitest';
import { planUpgradeLifecycle } from '../../src/features/work/upgrade-lifecycle';
import { upgradeLifecycleSchema } from '../../src/features/work/upgrade-lifecycle-model';
import type { UpgradeLifecycleView } from '../../src/features/work/upgrade-lifecycle-model';
import { advanceUpgradeLifecycle } from '../../src/features/work/upgrade-lifecycle-store';
import { openState } from '../../src/persistence/versioned-state';
import type { Envelope } from '../../src/persistence/versioned-state';
const policy = { enabled: true, cycleAtRcl8: true };
const own = { id: 'controller', ownership: 'own' as const, level: 8, reservedByOther: false };
const neutral = { ...own, ownership: 'neutral' as const, level: 0 };
const view: UpgradeLifecycleView = { tick: 1, controller: own, freeGcl: false, sponsorReady: true,
  fleetActive: true, claimer: { id: 'claimer', ready: true } };
const initial = () => upgradeLifecycleSchema.initial();
function fixture() {
  const records = new Map<string, Envelope>();
  return { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => { records.set(key, structuredClone(value)); } };
}
test('RCL8 reset waits for a ready claimer and explicit cycle enablement', () => {
  const missing = { ...view }; delete missing.claimer;
  const waiting = planUpgradeLifecycle(initial(), missing, policy);
  expect(waiting).toMatchObject({ claimerTarget: 1, reason: 'preparing-reset' });
  expect(waiting.command).toBeUndefined();
  for (const changed of [{ sponsorReady: false }, { fleetActive: false }, { claimer: { id: 'c', ready: false } }]) {
    expect(planUpgradeLifecycle(initial(), { ...view, ...changed }, policy).command).toBeUndefined();
  }
  expect(planUpgradeLifecycle(initial(), view, { ...policy, cycleAtRcl8: false }).reason).toBe('cycle-disabled');
  expect(planUpgradeLifecycle(initial(), view, policy).command).toEqual({ kind: 'unclaim', controller: 'controller', claimer: 'claimer' });
});
test('cycle completes only after observed release and lower-level reacquisition', () => {
  const release = planUpgradeLifecycle(initial(), view, policy);
  expect(release.state.cycles).toBe(0);
  const stillOwned = planUpgradeLifecycle(release.state, { ...view, tick: 2 }, policy);
  expect(stillOwned.state.releaseObserved).toBe(false);
  expect(stillOwned.state.cycles).toBe(0);
  const claim = planUpgradeLifecycle(stillOwned.state, { ...view, tick: 3, controller: neutral, freeGcl: true }, policy);
  expect(claim.state.releaseObserved).toBe(true);
  expect(claim.command?.kind).toBe('claim');
  expect(claim.state.cycles).toBe(0);
  const resumed = planUpgradeLifecycle(claim.state, { ...view, tick: 4, controller: { ...own, level: 1 } }, policy);
  expect(resumed.state).toMatchObject({ releaseObserved: false, cycles: 1, attempt: null });
  expect(resumed.reason).toBe('growing');
  expect(planUpgradeLifecycle(resumed.state, { ...view, tick: 5, controller: { ...own, level: 2 } }, policy).state.cycles).toBe(1);
});
test('reclaim after observed release survives economic gate closure and sponsor loss with an existing claimer', () => {
  const released = planUpgradeLifecycle(initial(), view, policy).state;
  const blocked = planUpgradeLifecycle(released, { ...view, tick: 2, controller: neutral, fleetActive: false }, policy);
  expect(blocked.reason).toBe('gcl-full');
  expect(blocked.command).toBeUndefined();
  const reclaim = planUpgradeLifecycle(blocked.state, { ...view, tick: 3, controller: neutral, fleetActive: false, sponsorReady: false, freeGcl: true }, policy);
  expect(reclaim.claimerTarget).toBe(0);
  expect(reclaim.command?.kind).toBe('claim');
});
test('unseen, foreign-owned and foreign-reserved controllers never produce controller actions', () => {
  for (const controller of [undefined, { ...own, ownership: 'foreign' as const }, { ...neutral, reservedByOther: true }]) {
    const observation = { ...view, freeGcl: true };
    if (controller) observation.controller = controller;
    else delete observation.controller;
    const plan = planUpgradeLifecycle(initial(), observation, policy);
    expect(plan.command).toBeUndefined();
    expect(plan.claimerTarget).toBe(0);
  }
});
test('initial claims and replaced controller identities cannot forge completed reset cycles', () => {
  const claim = planUpgradeLifecycle(initial(), { ...view, controller: neutral, freeGcl: true }, policy);
  expect(claim.command?.kind).toBe('claim');
  expect(planUpgradeLifecycle(claim.state, { ...view, tick: 2, controller: { ...own, level: 1 } }, policy).state.cycles).toBe(0);
  const release = planUpgradeLifecycle(initial(), view, policy);
  const changed = planUpgradeLifecycle(release.state, { ...view, tick: 2, controller: { ...neutral, id: 'replacement' }, freeGcl: true }, policy);
  expect(changed.state.releaseObserved).toBe(false);
  expect(changed.state.cycles).toBe(0);
});
test('disabled policy observes settlement but does not reclaim or destroy ownership', () => {
  const release = planUpgradeLifecycle(initial(), view, policy);
  const observed = planUpgradeLifecycle(release.state, { ...view, tick: 2, controller: neutral }, { enabled: false, cycleAtRcl8: false });
  expect(observed.state.releaseObserved).toBe(true);
  expect(observed.command).toBeUndefined();
  const observation = { ...view, tick: 3 }; delete observation.controller;
  const unseen = planUpgradeLifecycle(observed.state, observation, policy);
  expect(unseen.state.releaseObserved).toBe(true);
  expect(unseen.command).toBeUndefined();
});
test('persist-before-effect survives exceptions and reconstructing the coordinator in the same tick', () => {
  const state = fixture();
  let calls = 0;
  expect(() => advanceUpgradeLifecycle(state, 'W0N1', view, policy, command => {
    calls++;
    expect(openState(state, 'upgrade-lifecycle/W0N1', upgradeLifecycleSchema).attempt).toEqual({ ...command, tick: 1 });
    throw new Error('native call uncertain');
  })).toThrow('native call uncertain');
  const repeated = advanceUpgradeLifecycle(state, 'W0N1', view, policy, () => { calls++; });
  expect(repeated.reason).toBe('already-evaluated');
  expect(repeated.claimerTarget).toBe(1);
  expect(calls).toBe(1);
  advanceUpgradeLifecycle(state, 'W0N1', { ...view, tick: 2, controller: neutral, freeGcl: true }, policy, () => { calls++; });
  expect(calls).toBe(2);
  expect(openState(state, 'upgrade-lifecycle/W0N1', upgradeLifecycleSchema).cycles).toBe(0);
});
test('invalid and backwards observations fail before producing commands', () => {
  const state = planUpgradeLifecycle(initial(), view, policy).state;
  expect(() => planUpgradeLifecycle(state, { ...view, tick: 0 }, policy)).toThrow();
  expect(() => planUpgradeLifecycle(initial(), { ...view, controller: { ...own, level: 9 } }, policy)).toThrow();
  expect(upgradeLifecycleSchema.valid({ ...state, attempt: { ...state.attempt, tick: 2 } })).toBe(false);
});
