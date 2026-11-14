import { expect, test } from 'vitest';
import { allocateSpawns } from '../../src/capabilities/spawning/allocate';
import { replacementDue } from '../../src/capabilities/spawning/request';
import type { SpawnRequest } from '../../src/capabilities/spawning/request';
const request = (id: string, priority = 1, room = 'W0N0'): SpawnRequest => ({
  id, name: id, owner: 'economy', room, priority, readyAt: 10, expiresAt: 20, body: ['work', 'carry', 'move'],
});
const slots = [{ id: 'a', room: 'W0N0', busy: false }, { id: 'b', room: 'W0N0', busy: false }, { id: 'c', room: 'E0N0', busy: false }];
test('multiple spawns share room energy and allocate each request once by ascending priority', () => {
  const plans = allocateSpawns([request('later', 2), request('first', 0), request('remote', 3, 'E0N0')], slots,
    { W0N0: 300, E0N0: 200 }, new Set(), 10, 'skip');
  expect(plans.map(plan => [plan.spawn, plan.request.id])).toEqual([['a', 'first'], ['c', 'remote']]);
});
test('unaffordable head policy is explicit and does not block another room', () => {
  const expensive = { ...request('head', 0), body: ['claim'] as const };
  const requests = [expensive, request('cheap'), request('remote', 1, 'E0N0')];
  const energy = { W0N0: 300, E0N0: 300 };
  expect(allocateSpawns(requests, slots, energy, new Set(), 10, 'wait').map(plan => plan.request.id)).toEqual(['remote']);
  expect(allocateSpawns(requests, slots, energy, new Set(), 10, 'skip').map(plan => plan.request.id)).toEqual(['cheap', 'remote']);
});
test('expiry, not-ready, existing/spawning names, and busy slots prevent allocation', () => {
  const requests = [request('existing'), { ...request('future'), readyAt: 11 }, { ...request('expired'), expiresAt: 10, readyAt: 9 }];
  expect(allocateSpawns(requests, slots, { W0N0: 1000 }, new Set(['existing']), 10, 'skip')).toEqual([]);
  expect(allocateSpawns([request('ready')], slots.map(slot => ({ ...slot, busy: true })), { W0N0: 1000 }, new Set(), 10, 'skip')).toEqual([]);
  expect(() => allocateSpawns([request('same'), request('same')], slots, {}, new Set(), 10, 'skip')).toThrow('Duplicate');
});
test('replacement timing includes spawn duration, travel and margin at exact boundary', () => {
  expect(replacementDue(100, 20, 30, 10)).toBe(true);
  expect(replacementDue(101, 20, 30, 10)).toBe(false);
});
