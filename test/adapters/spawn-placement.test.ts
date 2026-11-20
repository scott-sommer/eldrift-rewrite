import { afterEach, expect, test, vi } from 'vitest';
import { createNativeSpawn } from '../../src/adapters/screeps/spawn';
import { createNativeStructureActions } from '../../src/adapters/screeps/structure-actions';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import type { SpawnAssignment } from '../../src/capabilities/spawning/request';
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  for (const [key,value] of Object.entries({ ERR_INVALID_TARGET: -7,ERR_BUSY: -4,LOOK_STRUCTURES: 'structure',LOOK_CONSTRUCTION_SITES: 'constructionSite',LOOK_SOURCES: 'source',LOOK_MINERALS: 'mineral',LOOK_DEPOSITS: 'deposit',STRUCTURE_RAMPART: 'rampart',TERRAIN_MASK_WALL: 1,OBSTACLE_OBJECT_TYPES: ['spawn','extension','constructedWall'],BODYPART_COST: { move: 50 } })) vi.stubGlobal(key,value);
  const tiles: Record<string,unknown[]> = {}, terrain = { wall: false }, room = { name: 'W0N1',energyAvailable: 300,controller: undefined as { pos: { x: number; y: number } } | undefined,
    lookForAt: (kind: string) => tiles[kind] ?? [],getTerrain: () => ({ get: () => terrain.wall ? 1 : 0 }) };
  const native = vi.fn(() => 0), direction = vi.fn(() => 7);
  const spawn = { id: 'spawn',my: true,room,pos: { x: 25,y: 25,getDirectionTo: direction },spawnCreep: native } as unknown as StructureSpawn;
  vi.stubGlobal('Game',{ time: 1,getObjectById: () => spawn });
  const assignment: SpawnAssignment = { spawn: 'spawn',cost: 50,request: { id: 'new',name: 'new',owner: 'remote',room: 'W0N1',body: ['move'],priority: 0,readyAt: 1,expiresAt: 20,placement: { spawn: 'spawn',exit: { room: 'W0N1',x: 24,y: 25 } } } };
  const root = {},state = createMemoryPort(() => root), invoke = createNativeSpawn(() => ({}));
  return { tiles,terrain,room,native,direction,spawn,assignment,state,invoke };
}
test('a bound native birth uses exactly the chosen exit direction and keeps injected memory',() => {
  const f = fixture(); expect(f.invoke(f.assignment)).toBe(0);
  expect(f.direction).toHaveBeenCalledWith(24,25); expect(f.native).toHaveBeenCalledWith(['move'],'new',{ memory: {},directions: [7] });
  delete f.assignment.request.placement; f.invoke(f.assignment); expect(f.native.mock.calls[1]).toEqual([['move'],'new',{ memory: {} }]);
});
test('wrong selected spawn or nonadjacent exit cannot invoke native birth',() => {
  const f = fixture(); f.assignment.request.placement!.spawn = 'other'; expect(f.invoke(f.assignment)).toBe(-7);
  f.assignment.request.placement!.spawn = 'spawn'; f.assignment.request.placement!.exit.x = 25; expect(f.invoke(f.assignment)).toBe(-7);
  expect(f.native).not.toHaveBeenCalled();
});
test('static obstacles, natural objects, controller tiles and hostile private ramparts refuse the exit',() => {
  const f = fixture();
  for (const kind of ['structure','constructionSite','source','mineral','deposit']) {
    f.tiles[kind] = [{ structureType: 'extension' }]; expect(f.invoke(f.assignment)).toBe(-7); f.tiles[kind] = [];
  }
  f.room.controller = { pos: { x: 24,y: 25 } }; expect(f.invoke(f.assignment)).toBe(-7); f.room.controller = undefined;
  f.tiles.structure = [{ structureType: 'rampart',my: false,isPublic: false }]; expect(f.invoke(f.assignment)).toBe(-7);
  f.tiles.structure = [{ structureType: 'rampart',my: false,isPublic: true }]; expect(f.invoke(f.assignment)).toBe(0);
});
test('terrain and road handling matches native birth walkability without changing the requested direction',() => {
  const f = fixture(); f.terrain.wall = true; expect(f.invoke(f.assignment)).toBe(-7);
  f.tiles.structure = [{ structureType: 'road' }]; expect(f.invoke(f.assignment)).toBe(0);
});
test('failed placement preflight consumes no shared structure or room-energy admission',() => {
  const f = fixture(), actions = createNativeStructureActions(f.state,() => ({})); f.tiles.structure = [{ structureType: 'extension' }];
  expect(actions.spawn(f.assignment)).toBe(-7); expect(actions.availableSpawn('spawn')).toBe(true); expect(actions.availableEnergy('W0N1',300)).toBe(300);
  f.tiles.structure = []; expect(actions.spawn(f.assignment)).toBe(0); expect(actions.availableEnergy('W0N1',300)).toBe(250);
});
