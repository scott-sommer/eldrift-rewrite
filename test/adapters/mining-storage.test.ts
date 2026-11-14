import { afterEach, expect, test, vi } from 'vitest';
import { stationInfrastructure } from '../../src/adapters/screeps/mining-station-infrastructure';
import { miningInfrastructure } from '../../src/adapters/screeps/mining-observation';
import type { MiningStation } from '../../src/capabilities/mining/station';
afterEach(() => vi.unstubAllGlobals());
function globals() {
  for (const name of ['STRUCTURE_CONTAINER', 'STRUCTURE_LINK', 'STRUCTURE_STORAGE', 'STRUCTURE_EXTRACTOR', 'FIND_MY_CONSTRUCTION_SITES']) vi.stubGlobal(name, name);
}
test('storage fallback ranks legal adjacent harvesting tiles and excludes inactive or foreign structures', () => {
  globals();
  const access = [{ room: 'home', x: 9, y: 10 }, { room: 'home', x: 11, y: 10 }];
  const storage = { id: 'storage', structureType: 'STRUCTURE_STORAGE', my: true, isActive: () => true,
    pos: { roomName: 'home', x: 12, y: 10 } };
  const observe = (item = storage) => stationInfrastructure(access, {} as RoomPosition, [item] as unknown as AnyStructure[]);
  expect(observe()).toMatchObject({ storage: 'storage', access: [access[1], access[0]] });
  expect(observe({ ...storage, my: false }).storage).toBeUndefined();
  expect(observe({ ...storage, isActive: () => false }).storage).toBeUndefined();
  expect(observe({ ...storage, pos: { roomName: 'home', x: 15, y: 10 } }).storage).toBeUndefined();
});
test('handoff falls back from full infrastructure to storage and refuses full, foreign or unreachable storage', () => {
  globals();
  const storage = { id: 'storage', structureType: 'STRUCTURE_STORAGE', my: true, isActive: () => true,
    hits: 1000, hitsMax: 1000, store: { getFreeCapacity: () => 20 } };
  const container = { ...storage, id: 'container', structureType: 'STRUCTURE_CONTAINER', store: { getFreeCapacity: () => 0 } };
  vi.stubGlobal('Game', { getObjectById: (id: string) => id === 'container' ? container : storage });
  const creep = { pos: { inRangeTo: () => true }, room: { find: () => [] } } as unknown as Creep;
  const station = { container: 'container', storage: 'storage', resource: 'energy', access: [] } as unknown as MiningStation;
  expect(miningInfrastructure(creep, station).sink?.id).toBe('storage');
  storage.store.getFreeCapacity = () => 0;
  expect(miningInfrastructure(creep, station).sink).toBeUndefined();
  storage.store.getFreeCapacity = () => 20;
  storage.my = false;
  expect(miningInfrastructure(creep, station).sink).toBeUndefined();
  storage.my = true;
  creep.pos.inRangeTo = () => false;
  expect(miningInfrastructure(creep, station).sink).toBeUndefined();
});
