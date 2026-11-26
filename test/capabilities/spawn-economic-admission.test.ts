import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import { spawnQueueSchema } from '../../src/features/population/spawn-schema';
import { openState } from '../../src/persistence/versioned-state';
import { validateRequest } from '../../src/capabilities/spawning/allocate';
import { sameSpawnRequest } from '../../src/capabilities/spawning/placement';
import type { SpawnRequest } from '../../src/capabilities/spawning/request';
const request: SpawnRequest = { id: 'cohort',name: 'cohort',owner: 'remote-owner',room: 'W0N1',body: ['move'],priority: 1,readyAt: 10,expiresAt: 100,admission: { kind: 'remote-startup',generation: 7,observedAt: 5 } };
test('economic marker survives queue deferral and JSON reset; matching is independent of property order',() => {
  const root = {}, state = createMemoryPort(() => root), queue = createSpawnQueue(state,'W0N1'); queue.submit(request); queue.defer(new Set([request.id]),10);
  const restored = createSpawnQueue(createMemoryPort(() => JSON.parse(JSON.stringify(root))),'W0N1').list()[0]!;
  expect(restored).toMatchObject({ readyAt: 11,admission: request.admission });
  expect(sameSpawnRequest(restored,{ ...restored,admission: { observedAt: 5,generation: 7,kind: 'remote-startup' } })).toBe(true);
  const ordinary = { ...restored }; delete ordinary.admission; expect(sameSpawnRequest(restored,ordinary)).toBe(false);
});
test('v4 requests retain all metadata but older readers refuse v5 and undeclared economic tags cannot migrate',() => {
  const root = {}, state = createMemoryPort(() => root), old = { ...request,admission: { kind: 'household-labor' as const,task: 'task',publication: true as const } };
  state.write('spawning/W0N1',{ owner: 'population',version: 4,data: { requests: [old] } });
  expect(createSpawnQueue(state,'W0N1').list()).toEqual([old]); expect(state.read('spawning/W0N1')).toMatchObject({ version: 5 });
  expect(() => openState(state,'spawning/W0N1',{ ...spawnQueueSchema('W0N1'),version: 4 })).toThrow('future version');
  state.write('spawning/W0N1',{ owner: 'population',version: 4,data: { requests: [request] } });
  const before = JSON.stringify(root); expect(() => createSpawnQueue(state,'W0N1').list()).toThrow('legacy remote startup admission'); expect(JSON.stringify(root)).toBe(before);
});
test('invalid or ambiguous financial markers cannot enter a queue',() => {
  for (const admission of [null,[],{ kind: 'remote-startup',generation: -1,observedAt: 5 },{ kind: 'remote-startup',generation: 1,observedAt: 0.5 },{ kind: 'remote-startup',generation: 1,observedAt: 5,task: 'borrowed' },{ kind: 'remote-startup',generation: 1 }]) {
    expect(() => validateRequest({ ...request,admission } as SpawnRequest)).toThrow();
  }
});
