import { expect, test } from 'vitest';
import { applyCourierDemand } from '../../src/features/logistics/courier-demand';
import type { CourierDemand, CourierUnit } from '../../src/features/logistics/courier-demand';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import type { Envelope } from '../../src/persistence/versioned-state';
const plan: CourierDemand = { owner: 'logistics', room: 'W0N1', body: ['carry', 'move'], utilization: 1,
  minimumCapacity: 0, travelTicks: 10, marginTicks: 5, priority: 1, requestLifetime: 100,
  routes: [{ id: 'source', production: 3, outboundTicks: 10, loadedReturnTicks: 25, serviceTicks: 2, delayTicks: 3 }] };
const worker: CourierUnit = { name: 'live', owner: 'logistics', room: 'W0N1', capacity: 20, ticksToLive: 100, spawning: false };
function fixture() {
  const records = new Map<string, Envelope>();
  return { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => { records.set(key, structuredClone(value)); } };
}
test('carry capacity, queued bodies and spawning identities jointly satisfy route demand', () => {
  const state = fixture();
  const first = applyCourierDemand(state, plan, [worker], 1);
  expect(first.required).toBe(120);
  expect(first.created).toHaveLength(2);
  expect(applyCourierDemand(state, plan, [worker], 2).created).toEqual([]);
  const spawned = { ...worker, name: first.created[0]!, spawning: true, ticksToLive: 0, capacity: 50 };
  const next = applyCourierDemand(state, plan, [worker, spawned], 3);
  expect(next.created).toEqual([]);
  expect(next.cancelled).toEqual([spawned.name]);
  expect(createSpawnQueue(state, 'W0N1').list()).toHaveLength(1);
});
test('replacement timing excludes retiring capacity; demand reduction cancels only its own queued work', () => {
  const state = fixture();
  const queue = createSpawnQueue(state, 'W0N1');
  queue.submit({ id: 'miner', name: 'miner', owner: 'mining', room: 'W0N1', body: ['work', 'carry', 'move'], priority: 0, readyAt: 1, expiresAt: 100 });
  expect(applyCourierDemand(state, plan, [{ ...worker, ticksToLive: 20 }], 1).created).toHaveLength(3);
  expect(applyCourierDemand(state, { ...plan, routes: [] }, [], 2).cancelled).toHaveLength(3);
  expect(queue.list().map(item => item.id)).toEqual(['miner']);
});

