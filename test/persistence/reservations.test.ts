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
