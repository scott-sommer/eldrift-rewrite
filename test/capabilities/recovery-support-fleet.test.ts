import { expect, test } from 'vitest';
import { maintainSupportFleet } from '../../src/features/recovery/support-fleet';
import type { SupportFleet } from '../../src/features/recovery/support-fleet';
import { supportOwner } from '../../src/features/recovery/support-identity';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import type { CourierUnit } from '../../src/features/logistics/courier-demand';
import type { Envelope } from '../../src/persistence/versioned-state';
const fleet: SupportFleet = { home: 'W0N1', target: 'W1N1', enabled: true, requestedCapacity: 250,
  body: ['carry', 'carry', 'move', 'move'], travelTicks: 20, requestLifetime: 100 };
function fixture() {
  const records = new Map<string, Envelope>();
  const state = { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => { records.set(key, structuredClone(value)); } };
  return { state, queue: createSpawnQueue(state, fleet.home) };
}
const live: CourierUnit = { name: 'small', owner: supportOwner(fleet.home, fleet.target), room: fleet.home,
  capacity: 50, spawning: false, ticksToLive: 500 };
test('mixed live and queued bodies count actual carry capacity, preserving route ownership and identity', () => {
  const { state, queue } = fixture();
  queue.submit({ id: 'small-queued', name: 'small-queued', owner: live.owner, room: fleet.home,
    body: ['carry', 'move'], priority: 2, readyAt: 1, expiresAt: 100 });
  maintainSupportFleet(state, fleet, [live], 1);
  expect(queue.list()).toHaveLength(3);
  expect(queue.list().map(item => item.body.filter(part => part === 'carry').length)).toEqual([1, 2, 2]);
  const larger = queue.list().filter(item => item.id !== 'small-queued');
  maintainSupportFleet(state, fleet, [live], 2);
  expect(queue.list()).toEqual(larger); // The newly surplus50capacity request is pruned.
  maintainSupportFleet(state, fleet, [live, { ...live, name: larger[0]!.name, capacity: 100, spawning: true, ticksToLive: 0 }], 3);
  expect(queue.list()).toEqual([larger[1]!]);
});
test('exit cancels only this donor-target fleet and reentry respects surviving capacity', () => {
  const { state, queue } = fixture();
  maintainSupportFleet(state, fleet, [live], 1);
  maintainSupportFleet(state, { ...fleet, target: 'W2N1', requestedCapacity: 100 }, [], 1);
  maintainSupportFleet(state, { ...fleet, enabled: false }, [live], 2);
  expect(queue.list()).toHaveLength(1);
  expect(queue.list()[0]!.owner).toBe(supportOwner(fleet.home, 'W2N1'));
  maintainSupportFleet(state, { ...fleet, requestedCapacity: 50 }, [live], 3);
  expect(queue.list()).toHaveLength(1);
  maintainSupportFleet(state, { ...fleet, requestedCapacity: 50 }, [{ ...live, ticksToLive: 1 }], 4);
  expect(queue.list()).toHaveLength(2);
});
test('a missing usable body cancels only scoped pending spawns and disabled empty routes allocate no queue', () => {
  const { state, queue } = fixture();
  maintainSupportFleet(state, { ...fleet, enabled: false }, [], 1);
  expect(state.read('spawning/' + fleet.home)).toBeUndefined();
  maintainSupportFleet(state, fleet, [], 2);
  maintainSupportFleet(state, { ...fleet, body: undefined }, [], 3);
  expect(queue.list()).toEqual([]);
  expect(() => maintainSupportFleet(state, { ...fleet, requestedCapacity: Infinity }, [], 4)).toThrow('Invalid support capacity');
});
