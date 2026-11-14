import { expect, test } from 'vitest';
import { reconcileDemand } from '../../src/capabilities/spawning/demand';
import type { PopulationUnit } from '../../src/capabilities/spawning/demand';
import type { SpawnRequest } from '../../src/capabilities/spawning/request';
const demand = { owner: 'mining:source-a', room: 'W0N0', desired: 1, replacementParts: 10, travelTicks: 20, marginTicks: 5 };
const unit = (name: string, ticksToLive: number, spawning = false): PopulationUnit => ({ name, ticksToLive, spawning, owner: demand.owner, room: demand.room });
const request = (id: string): SpawnRequest => ({ id, name: id, owner: demand.owner, room: demand.room, priority: 0, readyAt: 1, expiresAt: 100, body: ['move'] });
test('replacement uses new body spawn time, travel and margin without duplicating pending demand', () => {
  expect(reconcileDemand(demand, [unit('old', 56)], [], 1).missing).toBe(0);
  expect(reconcileDemand(demand, [unit('old', 55)], [], 1).missing).toBe(1);
  expect(reconcileDemand(demand, [unit('old', 55)], [request('next')], 1).missing).toBe(0);
  expect(reconcileDemand(demand, [unit('old', 55), unit('next', 0, true)], [request('next')], 1))
    .toEqual({ missing: 0, effective: 1, cancel: ['next'] });
});
test('falling demand cancels excess requests deterministically without affecting other scopes', () => {
  const pending = [request('b'), request('a'), { ...request('other'), owner: 'mining:source-b' }];
  expect(reconcileDemand(demand, [], pending, 1)).toEqual({ effective: 0, missing: 0, cancel: ['b'] });
  expect(reconcileDemand({ ...demand, desired: 0 }, [], pending, 1).cancel).toEqual(['b', 'a']);
  expect(reconcileDemand(demand, [{ ...unit('elsewhere', 100), room: 'E0N0' }], [], 1).missing).toBe(1);
});
test('expired requests no longer cover demand; future-ready requests still reserve population', () => {
  expect(reconcileDemand(demand, [], [{ ...request('expired'), expiresAt: 10 }], 10))
    .toEqual({ effective: 0, missing: 1, cancel: ['expired'] });
  expect(reconcileDemand(demand, [], [{ ...request('future'), readyAt: 20 }], 10).missing).toBe(0);
  expect(() => reconcileDemand({ ...demand, desired: -1 }, [], [], 1)).toThrow();
});
