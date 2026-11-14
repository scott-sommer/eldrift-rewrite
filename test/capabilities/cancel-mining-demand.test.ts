import { expect, test } from 'vitest';
import { cancelMiningDemand } from '../../src/features/mining/cancel-demand';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import type { Envelope } from '../../src/persistence/versioned-state';
test('pausing room mining removes only its queued miners and survives repeat calls', () => {
  const records = new Map<string, Envelope>();
  const port = { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => { records.set(key, value); } };
  for (const room of ['W0N0', 'E0N0']) {
    for (const owner of ['mining:source', 'hauling']) {
      createSpawnQueue(port, room).submit({ id: owner, name: room + owner, owner, room, priority: 0,
        readyAt: 1, expiresAt: 100, body: ['work', 'carry', 'move'] });
    }
  }
  expect(cancelMiningDemand(port, 'W0N0')).toBe(1);
  expect(cancelMiningDemand(port, 'W0N0')).toBe(0);
  expect(createSpawnQueue(port, 'W0N0').list().map(request => request.owner)).toEqual(['hauling']);
  expect(createSpawnQueue(port, 'E0N0').list()).toHaveLength(2);
});
