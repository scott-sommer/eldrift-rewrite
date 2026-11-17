import { afterEach, expect, test, vi } from 'vitest';
import { observeNativeIntel } from '../../src/app/native-intel-observation';
import { validRoomSummary } from '../../src/features/intel/summary-validation';
afterEach(() => vi.unstubAllGlobals());
function setup() {
  for (const [index, name] of ['FIND_HOSTILE_STRUCTURES','FIND_MINERALS','FIND_SOURCES','FIND_STRUCTURES','FIND_CREEPS','FIND_POWER_CREEPS'].entries()) vi.stubGlobal(name,index);
  vi.stubGlobal('STRUCTURE_CONTROLLER','controller');
  const pos = (x: number, y: number) => ({ roomName: 'W1N1', x, y });
  const controller = { id: 'controller', pos: pos(20,20), structureType: 'controller', level: 0, my: false,
    reservation: { username: 'reserver', ticksToEnd: 100 } };
  const road = { id: 'road', pos: pos(21,21), structureType: 'road' };
  const tower = { id: 'tower', pos: pos(25,25), structureType: 'tower', owner: { username: 'enemy' }, my: false };
  const source = { id: 'source', pos: pos(10,10), energyCapacity: 3000 };
  const mineral = { id: 'mineral', pos: pos(30,30), mineralType: 'H' };
  const creep = { id: 'creep', pos: pos(23,23), owner: { username: 'ally' }, my: false };
  const power = { id: 'power', pos: pos(24,24), owner: { username: 'bot' }, my: true };
  const finds = [[tower],[mineral],[source],[controller,road,tower],[creep],[power]];
  const room = { controller, find: (kind: number) => finds[kind] };
  const status = vi.fn(() => ({ status: 'novice', timestamp: 2000000000000 }));
  const exits = vi.fn(() => ({ 3: 'W0N1', 5: 'W1N0' }));
  const game = { time: 10, rooms: { W1N1: room }, map: { getRoomStatus: status, describeExits: exits } };
  vi.stubGlobal('Game',game);
  return { game, status, exits, source, creep };
}
test('native facts remain plain and distinguish raw hostility, own power units and reservation/status metadata', () => {
  const { source, creep } = setup();
  const summary = observeNativeIntel('W1N1')!;
  expect(validRoomSummary(summary)).toBe(true);
  expect(summary).toMatchObject({ observedAt: 10, status: 'novice', statusTimestamp: 2000000000000,
    controller: { owned: false, owner: null, reservation: { username: 'reserver', ticksToEnd: 100 } },
    structures: [{ id: 'road', owner: null, owned: false, hostile: false }, { id: 'tower', owner: 'enemy', hostile: true }],
    units: [{ id: 'creep', owner: 'ally', owned: false, power: false }, { id: 'power', owned: true, power: true }],
    exits: [{ direction: 3, room: 'W0N1' },{ direction: 5, room: 'W1N0' }] });
  source.energyCapacity = 0; creep.pos.x = 1;
  expect(summary.sources[0]!.capacity).toBe(3000);
  expect(summary.units[0]!.x).toBe(23);
});
test('lost vision causes no map reads and no empty snapshot; observation failures remain failures', () => {
  const { game, status, exits } = setup();
  delete (game.rooms as Record<string, unknown>).W1N1;
  expect(observeNativeIntel('W1N1')).toBeUndefined();
  expect(status).not.toHaveBeenCalled(); expect(exits).not.toHaveBeenCalled();
  setup().status.mockImplementation(() => { throw new Error('status unavailable'); });
  expect(() => observeNativeIntel('W1N1')).toThrow('status unavailable');
});
