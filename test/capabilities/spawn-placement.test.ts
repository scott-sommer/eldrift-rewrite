import { expect, test } from 'vitest';
import { allocateSpawns, validateRequest } from '../../src/capabilities/spawning/allocate';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import { spawnQueueSchema } from '../../src/features/population/spawn-schema';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState } from '../../src/persistence/versioned-state';
import type { SpawnRequest } from '../../src/capabilities/spawning/request';
const request = (id = 'bound'): SpawnRequest => ({ id,name: id,owner: 'mining',room: 'W0N1',priority: 0,readyAt: 1,expiresAt: 20,body: ['move'],placement: { spawn: 'z',exit: { room: 'W0N1',x: 24,y: 25 } } });
const slots = [{ id: 'a',room: 'W0N1',busy: false },{ id: 'z',room: 'W0N1',busy: false }];
test('a quoted spawn is selected even when another idle spawn sorts first',() => {
  const input = request(), result = allocateSpawns([input],slots,{ W0N1: 300 },new Set(),1,'skip');
  expect(result[0]!.spawn).toBe('z'); input.placement!.exit.x = 1;
  expect(result[0]!.request.placement!.exit.x).toBe(24);
});
test('a busy or absent selected spawn cannot fall back, while an unbound request can use idle capacity',() => {
  const bound = request(), unbound = { ...request('free'),priority: 1 }; delete unbound.placement;
  const busy = slots.map(slot => ({ ...slot,busy: slot.id === 'z' }));
  expect(allocateSpawns([bound],busy,{ W0N1: 300 },new Set(),1,'skip')).toEqual([]);
  expect(allocateSpawns([bound,unbound],busy,{ W0N1: 300 },new Set(),1,'wait').map(row => [row.spawn,row.request.id])).toEqual([['a','free']]);
  expect(allocateSpawns([bound],slots.slice(0,1),{ W0N1: 300 },new Set(),1,'skip')).toEqual([]);
});
test('placement metadata must identify a physical room tile and one bounded spawn identity',() => {
  for (const placement of [null,{ spawn: '',exit: { room: 'W0N1',x: 24,y: 25 } },{ spawn: 'z',exit: { room: 'E0N1',x: 24,y: 25 } },{ spawn: 'z',exit: { room: 'W0N1',x: 50,y: 25 } }]) {
    expect(() => validateRequest({ ...request(),placement } as SpawnRequest)).toThrow();
  }
});
test('queue serialization and per-tick deferral retain the constraint and reject mutation under the same identity',() => {
  const root = {},state = createMemoryPort(() => root), queue = createSpawnQueue(state,'W0N1'), original = request(); queue.submit(original);
  original.placement!.exit.x = 23; expect(queue.list()[0]!.placement!.exit.x).toBe(24); expect(() => queue.submit(original)).toThrow('already exists');
  queue.defer(new Set(['bound']),1);
  const memory = JSON.parse(JSON.stringify(root)), restored = createSpawnQueue(createMemoryPort(() => memory),'W0N1');
  expect(restored.list()[0]).toMatchObject({ readyAt: 2,placement: { spawn: 'z',exit: { x: 24 } } });
});
test('schema1 pending requests migrate without loss and older readers refuse the schema4 queue',() => {
  const root = {}, state = createMemoryPort(() => root), legacy = request(); delete legacy.placement;
  state.write('spawning/W0N1',{ owner: 'population',version: 1,data: { requests: [{ ...legacy,legacyTag: 'keep' }] } });
  expect(createSpawnQueue(state,'W0N1').list()[0]).toMatchObject({ id: 'bound',legacyTag: 'keep' });
  expect(state.read('spawning/W0N1')).toMatchObject({ version: 4 });
  expect(() => openState(state,'spawning/W0N1',{ ...spawnQueueSchema('W0N1'),version: 1 })).toThrow('future version');
});
test('legacy wire data cannot silently reinterpret an unsupported placement as a new constraint',() => {
  const root = {},state = createMemoryPort(() => root);
  state.write('spawning/W0N1',{ owner: 'population',version: 1,data: { requests: [request()] } });
  const before = JSON.stringify(root); expect(() => createSpawnQueue(state,'W0N1').list()).toThrow('legacy spawn placement'); expect(JSON.stringify(root)).toBe(before);
});
