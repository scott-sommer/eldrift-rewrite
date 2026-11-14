import { afterEach, expect, test, vi } from 'vitest';
import { observeWorkAssessment } from '../../src/adapters/screeps/work-assessment';
afterEach(() => vi.unstubAllGlobals());
test('controller prototype hit accessors do not make it a repairable structure', () => {
  vi.stubGlobal('FIND_STRUCTURES', 'structures'); vi.stubGlobal('FIND_MY_CONSTRUCTION_SITES', 'sites');
  const pos = { roomName: 'home', x: 10, y: 10 };
  const controller = { id: 'controller', pos, structureType: 'controller', hits: undefined, hitsMax: undefined, my: true, level: 2, ticksToDowngrade: 20000 };
  const road = { id: 'road', pos, structureType: 'road', hits: 100, hitsMax: 5000 };
  const hostile = { ...road, id: 'enemy', structureType: 'tower', my: false };
  const room = { controller, find: (type: string) => type === 'structures' ? [controller, road, hostile] : [] } as unknown as Room;
  const observed = observeWorkAssessment(room, new Set(), new Set(['road']));
  expect(observed.structures.map(item => [item.id, item.eligible, item.excluded])).toEqual([['road', true, true], ['enemy', false, false]]);
  expect(observed.controller).toMatchObject({ id: 'controller', owned: true });
});
