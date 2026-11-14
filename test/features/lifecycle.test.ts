import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createReservations } from '../../src/persistence/reservations/store';
import { cancelMission } from '../../src/features/missions/cancel';
import { transferColony } from '../../src/features/colony/transfer';
import { colonySchema } from '../../src/features/colony/state';
import { missionSchema } from '../../src/features/missions/state';
import { openState } from '../../src/persistence/versioned-state';

test('mission cancellation releases its claims and is safe to replay', () => {
  const memory = {};
  const port = createMemoryPort(() => memory);
  const claims = createReservations(port);
  claims.acquire({ resource: 'target', holder: 'unit', scope: 'mission:a', expiresAt: 100 }, 1);
  cancelMission(port, 'a', {});
  cancelMission(port, 'a', {});
  expect(openState(port, 'missions/a', missionSchema('a', {})).status).toBe('cancelled');
  expect(claims.acquire({ resource: 'target', holder: 'new', scope: 'mission:b', expiresAt: 100 }, 2)).toBe(true);
});

test('confirmed ownership transfer releases old colony scope and preserves other claims', () => {
  const memory = {};
  const port = createMemoryPort(() => memory);
  openState(port, 'colony/W1N1', colonySchema('W1N1', 'old'));
  const claims = createReservations(port);
  claims.acquire({ resource: 'source', holder: 'unit', scope: 'colony:W1N1:old', expiresAt: 100 }, 1);
  claims.acquire({ resource: 'other', holder: 'unit-b', scope: 'colony:W2N2:old', expiresAt: 100 }, 1);
  transferColony(port, 'W1N1', 'new');
  expect(openState(port, 'colony/W1N1', colonySchema('W1N1', 'new')).owner).toBe('new');
  expect(claims.releaseScope('colony:W1N1:old')).toBe(0);
  expect(claims.releaseScope('colony:W2N2:old')).toBe(1);
});
