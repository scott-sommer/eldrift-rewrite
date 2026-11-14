import { expect, test } from 'vitest';
import { applyMiningDemand, miningOwner } from '../../src/features/mining/demand';
import type { MiningDemand, MiningUnit } from '../../src/features/mining/demand';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import type { BodyPart } from '../../src/capabilities/spawning/body';
import type { Envelope } from '../../src/persistence/versioned-state';
const plan: MiningDemand = {
  home: 'W0N0', body: ['work', 'carry', 'move'], priority: 0, travelTicks: 5, marginTicks: 1, requestLifetime: 100,
  station: { id: 'source', target: 'source', kind: 'energy', resource: 'energy',
    position: { room: 'E0N0', x: 20, y: 20 }, access: [19, 20, 21].map(x => ({ room: 'E0N0', x, y: 21 })),
    throughput: 4, available: 3000, observedAt: 1, readyAt: 1, risk: 'safe' },
};
const rate = (body: readonly BodyPart[]) => body.filter(part => part === 'work').length * 2;
function fixture() {
  const records = new Map<string, Envelope>();
  const port = { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => {
    records.set(key, JSON.parse(JSON.stringify(value)) as Envelope);
  } };
  return { port, queue: createSpawnQueue(port, plan.home) };
}
test('mining demand persists requests, survives reconstruction and counts spawning workers once', () => {
  const { port, queue } = fixture();
  expect(applyMiningDemand(port, plan, [], 1, rate).created).toHaveLength(2);
  expect(applyMiningDemand(port, plan, [], 1, rate).created).toEqual([]);
  const first = queue.list()[0]!;
  const unit: MiningUnit = { name: first.name, owner: miningOwner(plan.station), room: plan.home, spawning: true, ticksToLive: 0, rate: 2 };
  expect(applyMiningDemand(port, plan, [unit], 2, rate).created).toEqual([]);
  expect(queue.list()).toHaveLength(1);
  expect(applyMiningDemand(port, plan, [{ ...unit, spawning: false, ticksToLive: 15 }], 3, rate).created).toHaveLength(1);
  expect(applyMiningDemand(port, plan, [{ ...unit, spawning: false, ticksToLive: 14 }], 4, rate).created).toEqual([]);
});
test('changed capacity cancels only station-owned excess and safety cancels its remainder', () => {
  const { port, queue } = fixture();
  applyMiningDemand(port, plan, [], 1, rate);
  queue.submit({ id: 'other', name: 'other', owner: 'hauling', room: plan.home, priority: 0, readyAt: 1, expiresAt: 100, body: ['move'] });
  const changed = { ...plan, station: { ...plan.station, throughput: 2 } };
  expect(applyMiningDemand(port, changed, [], 2, rate).cancel).toHaveLength(1);
  expect(applyMiningDemand(port, { ...changed, station: { ...changed.station, risk: 'hostile' } }, [], 3, rate).cancel).toHaveLength(1);
  expect(queue.list().map(request => request.id)).toEqual(['other']);
});
test('invalid body production or timing does not erase queued requests', () => {
  const { port, queue } = fixture();
  applyMiningDemand(port, plan, [], 1, rate);
  const before = queue.list();
  expect(() => applyMiningDemand(port, plan, [], 2, () => 0)).toThrow('production rate');
  expect(() => applyMiningDemand(port, { ...plan, travelTicks: -1 }, [], 2, rate)).toThrow('timing');
  expect(queue.list()).toEqual(before);
});

test('zero-production queued bodies are replaced rather than occupying source capacity', () => {
  const { port, queue } = fixture();
  queue.submit({ id: 'obsolete', name: 'obsolete', owner: miningOwner(plan.station), room: plan.home,
    priority: -1, readyAt: 1, expiresAt: 100, body: ['carry', 'move'] });
  const decision = applyMiningDemand(port, plan, [], 2, rate);
  expect(decision.cancel).toEqual(['obsolete']);
  expect(decision.created).toHaveLength(2);
  expect(queue.list().every(request => rate(request.body) > 0)).toBe(true);
});
