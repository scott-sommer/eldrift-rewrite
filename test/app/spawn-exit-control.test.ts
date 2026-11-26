import type { MovementCommand } from '../../src/adapters/screeps/movement-service';
import { afterEach, expect, test, vi } from 'vitest';
import { createSpawnExitControl } from '../../src/app/spawn-exit-control';
import { pendingSpawnExits, spawnExitAvoidance, permitsSpawnExit } from '../../src/adapters/screeps/spawn-exits';
import { populationMemory } from '../../src/adapters/screeps/population';
import { createActionArbiter } from '../../src/core/execution/action-arbiter';
vi.mock('../../src/adapters/screeps/service-position',() => ({ canStandAt: () => true }));
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  const exit = { room: 'W0N1',x: 9,y: 10 }, request = { id: 'newborn',name: 'newborn',owner: 'owner',room: 'W0N1',body: ['move'] as const,priority: 0,readyAt: 1,expiresAt: 2,placement: { spawn: 'spawn',exit } };
  const newborn = { id: 'born-id',name: 'newborn',my: true,spawning: true,pos: { roomName: 'W0N1',x: 10,y: 10 },memory: populationMemory(request) };
  const blocker = { id: 'blocker-id',name: 'blocker',my: true,spawning: false,fatigue: 0,pos: { roomName: 'W0N1',x: 9,y: 10 },getActiveBodyparts: () => 1 };
  const room = { name: 'W0N1' }, spawn = { id: 'spawn',my: true,room,pos: { x: 10,y: 10 },spawning: { name: 'newborn',remainingTime: 5 } };
  vi.stubGlobal('MOVE','move'); vi.stubGlobal('Game',{ time: 1,spawns: { Spawn1: spawn },creeps: { newborn,blocker },rooms: { W0N1: room } });
  const arbiter = createActionArbiter(() => Game.time), movement = { move: vi.fn<(creep: Creep,command: MovementCommand) => { status: 'running' }>(() => ({ status: 'running' })) };
  return { exit,request,newborn,blocker,spawn,arbiter,movement,clear: createSpawnExitControl(arbiter,movement) };
}
test('only a real pending selected birth protects its detached exit and exempts its own child',() => {
  const f = fixture(); f.request.placement.exit.x = 1;
  expect(pendingSpawnExits()[0]?.position).toEqual({ room: 'W0N1',x: 9,y: 10 });
  const protectedPoint = { room: 'W0N1',x: 9,y: 10 };
  expect(spawnExitAvoidance('other')).toEqual([protectedPoint]); expect(spawnExitAvoidance('newborn')).toEqual([]);
  expect(permitsSpawnExit('blocker-id',protectedPoint)).toBe(false); expect(permitsSpawnExit('born-id',protectedPoint)).toBe(true);
  Object.assign(f.spawn,{ spawning: null }); expect(pendingSpawnExits()).toEqual([]);
});
test('owned mobile blocker gets one priority move before normal role ownership',() => {
  const f = fixture(); expect(f.clear()).toBe(true); expect(f.clear()).toBe(false);
  expect(f.movement.move).toHaveBeenCalledTimes(1);
  const command = f.movement.move.mock.calls[0]![1]; expect(command).toMatchObject({ owner: 'spawn-exit:spawn',range: 0,priority: -1000 });
  expect(command.destination).not.toEqual(f.exit); expect(f.arbiter.claim('blocker','normal-role')).toBe(false);
});
test('foreign/immobile actors and an existing action owner are never overridden',() => {
  const foreign = fixture(); foreign.blocker.my = false; expect(foreign.clear()).toBe(false);
  const immobile = fixture(); immobile.blocker.getActiveBodyparts = () => 0; expect(immobile.clear()).toBe(false);
  const owned = fixture(); owned.arbiter.claim('blocker','other'); expect(owned.clear()).toBe(false); expect(owned.movement.move).not.toHaveBeenCalled();
});
