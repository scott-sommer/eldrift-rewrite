import { afterEach, expect, test, vi } from 'vitest';
import { createNativeStructureActions } from '../../src/adapters/screeps/structure-actions';
import type { Envelope } from '../../src/persistence/versioned-state';
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  const records = new Map<string, Envelope>();
  const state = { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => { records.set(key, structuredClone(value)); } };
  const room = { name: 'W0N1', energyAvailable: 100 };
  const spawn = { id: 'spawn', my: true, room, renewCreep: vi.fn(() => 0), spawnCreep: vi.fn(() => 0) } as unknown as StructureSpawn;
  const lab = { id: 'lab', my: true, room, boostCreep: vi.fn(() => 0) } as unknown as StructureLab;
  const creep = { id: 'unit', my: true, room, body: [{ type: 'work', hits: 100 }, { type: 'move', hits: 100 }] } as Creep;
  vi.stubGlobal('Game', { time: 1, getObjectById: () => spawn });
  for (const [name, value] of Object.entries({ ERR_BUSY: -4, ERR_INVALID_TARGET: -7, ERR_NOT_OWNER: -1,
    CREEP_SPAWN_TIME: 3, BODYPART_COST: { work: 100, move: 50 } })) vi.stubGlobal(name, value);
  const make = () => createNativeStructureActions(state, () => ({}));
  const assignment = { spawn: 'spawn', cost: 50, request: { id: 'request', name: 'new', owner: 'population', room: room.name,
    priority: 1, readyAt: 1, expiresAt: 10, body: ['move' as const] } };
  return { spawn, creep, lab, make, assignment, room };
}
test('renewal reserves the spawn, body and exact room energy before native effects', () => {
  const f = fixture();
  expect(f.make().renew(f.spawn, f.creep, 'upgrade')).toBe(0);
  expect(f.make().availableEnergy(f.room.name, 100)).toBe(70);
  expect(f.make().availableSpawn(f.spawn.id)).toBe(false);
  expect(f.make().boost(f.lab, f.creep, 'upgrade')).toBe(-4);
  expect(f.make().spawn(f.assignment)).toBe(-4);
  expect(f.spawn.renewCreep).toHaveBeenCalledTimes(1);
  expect(f.lab.boostCreep).not.toHaveBeenCalled();
  Game.time++;
  expect(f.make().boost(f.lab, f.creep, 'upgrade')).toBe(0);
  expect(f.make().renew(f.spawn, f.creep, 'upgrade')).toBe(-4);
});
test('spawning excludes renewal and debits recomputed cost rather than trusting assignment cost', () => {
  const f = fixture();
  expect(f.make().spawn({ ...f.assignment, cost: 0 })).toBe(0);
  expect(f.make().availableEnergy(f.room.name, 100)).toBe(50);
  expect(f.make().renew(f.spawn, f.creep, 'upgrade')).toBe(-4);
  expect(f.spawn.renewCreep).not.toHaveBeenCalled();
});
test('uncertain and rejected effects retain admission for this tick; ownership rejection has no effects', () => {
  const f = fixture();
  vi.mocked(f.spawn.renewCreep).mockImplementation(() => { throw new Error('interrupted'); });
  expect(() => f.make().renew(f.spawn, f.creep, 'upgrade')).toThrow('interrupted');
  expect(f.make().renew(f.spawn, f.creep, 'upgrade')).toBe(-4);
  Game.time++;
  vi.mocked(f.spawn.renewCreep).mockReturnValue(-9);
  expect(f.make().renew(f.spawn, f.creep, 'upgrade')).toBe(-9);
  expect(f.make().renew(f.spawn, f.creep, 'upgrade')).toBe(-4);
  Game.time++;
  expect(f.make().boost({ ...f.lab, my: false } as StructureLab, f.creep, 'upgrade')).toBe(-1);
  expect(f.make().boost(f.lab, f.creep, 'upgrade')).toBe(0);
});

test('observation has one durable structure owner even after rejection, interruption or recreation', () => {
  const f = fixture(), invoke = vi.fn(() => -9);
  const observer = { id: 'observer', my: true, observeRoom: invoke } as unknown as StructureObserver;
  expect(f.make().observe(observer, 'E0N1', 'scanning')).toBe(-9);
  expect(f.make().observe(observer, 'W1N1', 'operator')).toBe(-4);
  expect(invoke).toHaveBeenCalledTimes(1);
  Game.time++;
  invoke.mockImplementation(() => { throw new Error('interrupted observer'); });
  expect(() => f.make().observe(observer, 'E0N1', 'scanning')).toThrow('interrupted');
  expect(f.make().observe(observer, 'W1N1', 'operator')).toBe(-4);
  Game.time++;
  expect(f.make().observe({ ...observer, my: false }, 'E0N1', 'scanning')).toBe(-1);
  expect(invoke).toHaveBeenCalledTimes(2);
});
