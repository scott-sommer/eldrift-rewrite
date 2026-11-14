import { afterEach, expect, test, vi } from 'vitest';
import { observeReclamationSupply } from '../../src/adapters/screeps/reclamation-supply';
afterEach(() => vi.unstubAllGlobals());
test('reclamation is opt-in and limits owned active donors to owned active spawning infrastructure', () => {
  for (const name of ['FIND_STRUCTURES', 'RESOURCE_ENERGY', 'STRUCTURE_SPAWN', 'STRUCTURE_EXTENSION', 'STRUCTURE_LINK', 'STRUCTURE_LAB']) vi.stubGlobal(name, name);
  const structure = (id: string, type: string, my = true, active = true) => ({ id, my, structureType: type, isActive: () => active,
    pos: { roomName: 'home', x: 10, y: 10 }, store: { getUsedCapacity: (resource: string) => resource === 'RESOURCE_ENERGY' ? 30 : 2000 } });
  const room = { find: vi.fn(() => [structure('lab', 'STRUCTURE_LAB'), structure('link', 'STRUCTURE_LINK'),
    structure('enemy', 'STRUCTURE_LAB', false), structure('inactive', 'STRUCTURE_LINK', true, false),
    structure('spawn', 'STRUCTURE_SPAWN'), structure('extension', 'STRUCTURE_EXTENSION'),
    structure('enemy-spawn', 'STRUCTURE_SPAWN', false), structure('inactive-extension', 'STRUCTURE_EXTENSION', true, false)]) };
  expect(observeReclamationSupply(room as unknown as Room, false)).toEqual([]);
  expect(room.find).not.toHaveBeenCalled();
  expect(observeReclamationSupply(room as unknown as Room, true)).toEqual(['lab', 'link'].map(id => ({ id, amount: 30, priority: 1,
    allowedSinks: ['spawn', 'extension'], position: { room: 'home', x: 10, y: 10 } })));
});
