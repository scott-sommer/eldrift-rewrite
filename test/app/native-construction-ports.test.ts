import { afterEach, expect, test, vi } from 'vitest';
import { nativeConstructionPorts, nativeConstructionSiteKeys, nativeConstructionResult } from '../../src/app/native-construction-ports';
import { observeRoomPlanningInput } from '../../src/adapters/screeps/room-assessment';
vi.mock('../../src/adapters/screeps/room-assessment', () => ({ observeRoomPlanningInput: vi.fn() }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
function setup() {
  const room = { controller: { my: true, level: 6 }, find: () => [],
    storage: { my: true, store: { getUsedCapacity: () => 50000 } },
    terminal: { my: true, store: { getUsedCapacity: () => 10000 } }, createConstructionSite: vi.fn(() => 0) };
  vi.stubGlobal('Game', { rooms: { W0N1: room }, constructionSites: {
    remote: { structureType: 'road', pos: { roomName: 'W1N1', x: 20, y: 20 } } } });
  for (const [key, value] of Object.entries({ FIND_CONSTRUCTION_SITES: 4, FIND_HOSTILE_CREEPS: 5,
    RESOURCE_ENERGY: 'energy', MAX_CONSTRUCTION_SITES: 100, OK: 0, ERR_FULL: -8, ERR_RCL_NOT_ENOUGH: -14,
    ERR_NOT_OWNER: -1, ERR_INVALID_ARGS: -10, CONTROLLER_STRUCTURES: { road: Array(9).fill(2500) } })) vi.stubGlobal(key, value);
  vi.mocked(observeRoomPlanningInput).mockReturnValue({ terrain: Array(2500).fill('plain'), objects: [], constraints: [],
    infrastructure: [{ id: 'neutral', type: 'container', position: { x: 25, y: 25 }, walkable: true, owned: false },
      { id: 'hostile', type: 'spawn', position: { x: 20, y: 25 }, walkable: false, owned: false }] });
  return room;
}
test('native observation defines usable reserves, public infrastructure and global site identity', () => {
  const room = setup();
  const observed = nativeConstructionPorts('W0N1', 3).observe();
  expect(observed.storedEnergy).toBe(50000);
  expect(nativeConstructionPorts('W0N1', 3, true).observe().storedEnergy).toBe(60000);
  expect(observed.completed.has('container:25:25')).toBe(true);
  expect(observed.completed.has('spawn:20:25')).toBe(false);
  expect(nativeConstructionSiteKeys()).toEqual(new Set(['W1N1/road:20:20']));
  room.storage.my = false;
  expect(nativeConstructionPorts('W0N1', 3).observe().storedEnergy).toBe(0);
});
test('native site creation refuses lost ownership and maps engine results explicitly', () => {
  const room = setup(), ports = nativeConstructionPorts('W0N1', 3);
  const entry = { type: 'road', x: 25, y: 25, rcl: 1, priority: 1, source: 'strategy' as const };
  expect(ports.create(entry).status).toBe('created');
  room.controller.my = false;
  expect(ports.create(entry).status).toBe('not-owned');
  expect(room.createConstructionSite).toHaveBeenCalledTimes(1);
  expect(() => ports.observe()).toThrow('unavailable');
  expect([-8, -14, -1, -10, -7].map(code => nativeConstructionResult(code).status))
    .toEqual(['full', 'rcl', 'not-owned', 'invalid', 'retry']);
});

test('explicit remote port keeps level-zero limits and refuses foreign reservations and non-infrastructure', () => {
  const room = setup();
  room.controller.my = false; room.controller.level = 0;
  const ports = nativeConstructionPorts('W0N1', 3, false, { rooms: ['W0N1'], username: 'eldrift' });
  const observed = ports.observe();
  expect(observed.level).toBe(0);
  expect(observed.stageLevel).toBe(1);
  const entry = { type: 'road', x: 25, y: 25, rcl: 1, priority: 1, source: 'strategy' as const };
  expect(ports.create(entry).status).toBe('created');
  expect(ports.create({ ...entry, type: 'spawn' }).reason).toBe('remote-structure-type');
  Object.assign(room.controller, { reservation: { username: 'other' } });
  expect(ports.create(entry).reason).toBe('foreign-reservation');
  expect(room.createConstructionSite).toHaveBeenCalledTimes(1);
});
