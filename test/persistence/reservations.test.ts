import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createReservations } from '../../src/persistence/reservations/store';

test('claims survive reset, reject contention and release on holder death or scope cancellation', () => {
  let memory = {};
  const port = createMemoryPort(() => memory);
  let claims = createReservations(port);
  const claim = { resource: 'source-slot-a', holder: 'miner-a', scope: 'colony-W1N1', expiresAt: 20 };
  expect(claims.acquire(claim, 1)).toBe(true);
  memory = JSON.parse(JSON.stringify(memory));
  claims = createReservations(createMemoryPort(() => memory));
  expect(claims.acquire({ ...claim, holder: 'miner-b' }, 2)).toBe(false);
  expect(claims.releaseHolder('miner-a')).toBe(1);
  expect(claims.acquire({ ...claim, holder: 'miner-b' }, 2)).toBe(true);
  expect(claims.releaseScope('colony-W1N1')).toBe(1);
  expect(claims.releaseScope('colony-W1N1')).toBe(0);
});

test('ownership transfer releases old scope while unrelated claims persist; expiry is exact', () => {
  const claims = createReservations(createMemoryPort(() => memory));
  const memory = {};
  claims.acquire({ resource: 'a', holder: 'a', scope: 'old-owner', expiresAt: 10 }, 1);
  claims.acquire({ resource: 'b', holder: 'b', scope: 'other-room', expiresAt: 20 }, 1);
  expect(claims.releaseScope('old-owner')).toBe(1);
  expect(claims.expire(19)).toBe(0);
  expect(claims.expire(20)).toBe(1);
});

test('held-claim queries are detached, scope-specific and do not initialize missing memory', () => {
  const root = {}, claims = createReservations(createMemoryPort(() => root));
  expect(claims.held('mine',1)).toEqual([]); expect(root).toEqual({});
  claims.acquire({ resource: 'tile',holder: 'unit',scope: 'mine',expiresAt: 5 },1);
  claims.acquire({ resource: 'other',holder: 'other',scope: 'other',expiresAt: 9 },1);
  const result = claims.held('mine',2); expect(result.map(claim => claim.resource)).toEqual(['tile']);
  result[0]!.expiresAt = 99;
  expect(claims.held('mine',5)).toEqual([]);
  expect(() => claims.held('mine',-1)).toThrow('query');
});
