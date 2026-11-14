import { expect, test } from 'vitest';
import { createSpawnCoordinator } from '../../src/features/population/spawn-coordinator';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import type { Envelope } from '../../src/persistence/versioned-state';
test('persistent admission prevents reset dispatch of another pending request on the same spawn', () => {
  const records = new Map<string, Envelope>();
  const state = { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => { records.set(key, structuredClone(value)); } };
  const queue = createSpawnQueue(state, 'W0N0');
  for (const id of ['first', 'second']) queue.submit({ id, name: id, owner: 'economy', room: 'W0N0', priority: 0,
    readyAt: 1, expiresAt: 10, body: ['move'] });
  let tick = 1;
  let calls = 0;
  const names = new Set<string>();
  const ports = { clock: () => tick, invoke: () => { calls++; return 0; } };
  const observe = () => ({ rooms: ['W0N0'], slots: [{ id: 'spawn', room: 'W0N0', busy: false }], energy: { W0N0: 300 }, names });
  const make = () => createSpawnCoordinator(state, ports, observe, 'skip');
  expect(make()()[0]?.status).toBe('accepted');
  expect(make()()).toEqual([]);
  expect(calls).toBe(1);
  names.add('first');
  tick++;
  expect(make()()[0]?.request).toBe('second');
  expect(queue.list().map(request => request.id)).toEqual(['second']);
  expect(calls).toBe(2);
});
test('failed admission persistence prevents native effects', () => {
  const state = { read: () => ({ owner: 'population', version: 1, data: { tick: -1 } }), write: () => { throw new Error('disk'); } };
  let effects = 0;
  const run = createSpawnCoordinator(state, { clock: () => 1, invoke: () => { effects++; return 0; } },
    () => ({ rooms: [], slots: [], energy: {}, names: new Set() }), 'wait');
  expect(run).toThrow('disk');
  expect(effects).toBe(0);
});
