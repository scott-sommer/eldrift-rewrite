import { expect, test } from 'vitest';
import { bodyCost } from '../../src/capabilities/spawning/body';
import { roadScavenger } from '../../src/capabilities/spawning/economy-recipes';
import { planRecoveryScavenger } from '../../src/features/recovery/scavenger-plan';
import { maintainRecoveryScavengers } from '../../src/features/recovery/scavenger-demand';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import { scavengerOwner } from '../../src/features/logistics/identity';
import type { Envelope } from '../../src/persistence/versioned-state';
const room = 'W0N1';
const demand = { room, active: true, availableEnergy: 150, capacityEnergy: 800, maximumBudget: 1600 };
function fixture() {
  const records = new Map<string, Envelope>();
  const state = { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => { records.set(key, structuredClone(value)); } };
  return { state, queue: createSpawnQueue(state, room) };
}
const small = roadScavenger(150)!.parts;
const maximum = roadScavenger(800)!.parts;
test('first scavenger snapshots available energy ahead of miners; full-size escalation follows miners', () => {
  const first = planRecoveryScavenger({ ...demand, live: [], pending: [] })!;
  expect(bodyCost(first.body)).toBe(150);
  expect(first.priority).toBeLessThan(0);
  expect(planRecoveryScavenger({ ...demand, availableEnergy: 50, live: [], pending: [] })).toBeUndefined();
  expect(planRecoveryScavenger({ ...demand, availableEnergy: 0, live: [small], pending: [] })).toEqual({ body: maximum, priority: 1 });
  expect(planRecoveryScavenger({ ...demand, live: [maximum], pending: [] })).toBeUndefined();
  expect(planRecoveryScavenger({ ...demand, live: [small], pending: [small] })).toBeUndefined();
  expect(planRecoveryScavenger({ ...demand, maximumBudget: 150, live: [small], pending: [] })).toBeUndefined();
});
test('queued bootstrap identity/body is retained as energy changes; spawning is not counted twice or escalated early', () => {
  const { state, queue } = fixture();
  maintainRecoveryScavengers(state, demand, [], 1);
  const first = queue.list()[0]!;
  maintainRecoveryScavengers(state, { ...demand, availableEnergy: 800 }, [], 2);
  expect(queue.list()).toEqual([first]);
  const unit = { name: first.name, owner: scavengerOwner(room), room, body: first.body, spawning: true, ticksToLive: 0 };
  maintainRecoveryScavengers(state, demand, [unit], 3);
  expect(queue.list()).toEqual([]);
  maintainRecoveryScavengers(state, demand, [{ ...unit, spawning: false, ticksToLive: 1400 }], 4);
  expect(queue.list()).toHaveLength(1);
  expect(queue.list()[0]).toMatchObject({ body: maximum, priority: 1 });
  maintainRecoveryScavengers(state, demand, [{ ...unit, spawning: false, ticksToLive: 1399 }], 5);
  expect(queue.list()).toHaveLength(1);
});
test('recovery exit cancels only scavenger demand and a returning recovery can bootstrap again', () => {
  const { state, queue } = fixture();
  queue.submit({ id: 'courier', name: 'courier', owner: 'logistics:other', room, body: ['carry', 'move'], priority: 1, readyAt: 1, expiresAt: 100 });
  maintainRecoveryScavengers(state, demand, [], 1);
  maintainRecoveryScavengers(state, { ...demand, active: false }, [], 2);
  expect(queue.list().map(item => item.id)).toEqual(['courier']);
  maintainRecoveryScavengers(state, demand, [], 3);
  expect(queue.list()).toHaveLength(2);
});
test('expired or newly oversized requests are replaced without changing unrelated ownership', () => {
  const { state, queue } = fixture();
  maintainRecoveryScavengers(state, { ...demand, availableEnergy: 800 }, [], 1);
  const original = queue.list()[0]!;
  maintainRecoveryScavengers(state, { ...demand, maximumBudget: 100 }, [], 2);
  expect(queue.list()[0]!.id).not.toBe(original.id);
  expect(bodyCost(queue.list()[0]!.body)).toBe(100);
  const reduced = queue.list()[0]!;
  maintainRecoveryScavengers(state, { ...demand, maximumBudget: 100 }, [], 103);
  expect(queue.list()[0]!.id).not.toBe(reduced.id);
});

test('courier-only cancellation preserves scavenger requests; disabling hauling cancels both', async () => {
  const { cancelCourierDemand, cancelHaulingDemand } = await import('../../src/app/native-courier-population');
  const { haulingOwner } = await import('../../src/features/logistics/identity');
  const { state, queue } = fixture();
  maintainRecoveryScavengers(state, demand, [], 1);
  queue.submit({ id: 'courier', name: 'courier', owner: haulingOwner(room), room, body: ['carry', 'move'], priority: 1, readyAt: 1, expiresAt: 100 });
  cancelCourierDemand(state, room);
  expect(queue.list()).toHaveLength(1);
  expect(queue.list()[0]!.owner).toBe(scavengerOwner(room));
  cancelHaulingDemand(state, room);
  expect(queue.list()).toEqual([]);
});
test('capacity loss re-plans an impossible queued body and disabled empty rooms allocate no state', () => {
  const { state, queue } = fixture();
  maintainRecoveryScavengers(state, { ...demand, active: false }, [], 1);
  expect(state.read('spawning/' + room)).toBeUndefined();
  maintainRecoveryScavengers(state, { ...demand, availableEnergy: 800 }, [], 2);
  maintainRecoveryScavengers(state, { ...demand, capacityEnergy: 300 }, [], 3);
  expect(bodyCost(queue.list()[0]!.body)).toBe(150);
});
