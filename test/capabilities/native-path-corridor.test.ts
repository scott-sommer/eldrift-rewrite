import { afterEach, expect, test, vi } from 'vitest';
import { createNativePathSearch } from '../../src/adapters/screeps/path-search';
afterEach(() => vi.unstubAllGlobals());
test('native search room budget cannot exceed the permitted route corridor', () => {
  class Position {
    constructor(public x: number, public y: number, public roomName: string) {}
  }
  vi.stubGlobal('RoomPosition', Position);
  const search = vi.fn(() => ({ path: [new Position(20, 20, 'W0N1')], incomplete: false, cost: 1, ops: 1 }));
  vi.stubGlobal('PathFinder', { search });
  const run = createNativePathSearch(() => undefined);
  run({ origin: { room: 'W0N1', x: 10, y: 10 }, destination: { room: 'W0N1', x: 20, y: 20 }, range: 0,
    profile: { id: 'test', plainCost: 1, swampCost: 5, maxOps: 4000, maxRooms: 16 },
    topologyVersion: 'one', policyVersion: 'one', allowedRooms: ['W0N1'] });
  expect(search).toHaveBeenCalledWith(expect.any(Position), expect.any(Object), expect.objectContaining({ maxRooms: 1 }));
});
