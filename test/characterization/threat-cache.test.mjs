import { expect, test } from 'vitest';
import { legacy } from './legacy.mjs';

test.each([null, undefined, { id: 'enemy' }])('old defense predicate never activates for hostile %j', hostile => {
  let activations = 0;
  const room = { name: 'W1N1', flags: [{ name: 'Safe:5', pos: { roomName: 'W1N1', findClosestByRange: () => hostile, getRangeTo: () => 1 } }], controller: { activateSafeMode: () => activations++ } };
  const ctx = legacy(['oldSafeMode'], { _: { filter: (items, fn) => items.filter(fn) }, FIND_HOSTILE_CREEPS: 1 });
  ctx.oldSafeMode(room);
  expect(activations).toBe(0);
});

test.each([[null, 1, 0], [{ id: 'enemy' }, 4, 1], [{ id: 'enemy' }, 5, 0], [{ id: 'enemy' }, 6, 0]])('defense manager safe flag uses strict range boundary', (hostile, range, expected) => {
  let activations = 0;
  const room = { name: 'W1N1', flags: [{ name: 'Safe:5', pos: { roomName: 'W1N1', findClosestByRange: () => hostile, getRangeTo: () => range } }], controller: { activateSafeMode: () => activations++ } };
  const ctx = legacy(['managerSafeMode'], { _: { filter: (items, fn) => items.filter(fn) }, FIND_HOSTILE_CREEPS: 1 });
  ctx.managerSafeMode(room);
  expect(activations).toBe(expected);
});

test.each(['getLabRooms', 'get10LabRooms'])('%s clears unrelated cache data when a room is unseen', symbol => {
  const visible = { getStructuresByType: () => Array(10).fill({}) };
  const memory = { roomCache: { visible: { preserved: true }, unseen: { sources: ['source-a'], layout: 'standard' } } };
  const ctx = legacy([symbol], { Memory: memory, Game: { rooms: { visible } }, STRUCTURE_LAB: 'lab', console: { log() {} } });
  expect(ctx[symbol]()).toEqual([visible]);
  expect(memory.roomCache.unseen).toBeUndefined();
  expect(memory.roomCache.visible).toEqual({ preserved: true });
});
