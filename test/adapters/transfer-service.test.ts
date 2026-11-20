import { afterEach, expect, test, vi } from 'vitest';
import { createNativeTransfer } from '../../src/adapters/screeps/transfer';
import { createActionArbiter } from '../../src/core/execution/action-arbiter';
import type { NativeTransferCommand } from '../../src/adapters/screeps/transfer-target';
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  for (const [key,value] of Object.entries({ LOOK_STRUCTURES: 'structure',LOOK_CONSTRUCTION_SITES: 'constructionSite',LOOK_SOURCES: 'source',LOOK_MINERALS: 'mineral',LOOK_DEPOSITS: 'deposit',STRUCTURE_RAMPART: 'rampart',TERRAIN_MASK_WALL: 1,OBSTACLE_OBJECT_TYPES: ['spawn','extension'] })) vi.stubGlobal(key,value);
  const obstacles: unknown[] = [], room = { lookForAt: (kind: string) => kind === 'structure' ? obstacles : [],getTerrain: () => ({ get: () => 0 }) };
  const position = { roomName: 'E0N1',x: 6,y: 24,inRangeTo: (target: { pos: { x: number; y: number } },range: number) => Math.max(Math.abs(position.x-target.pos.x),Math.abs(position.y-target.pos.y)) <= range };
  const target = { id: 'container',structureType: 'container',pos: { roomName: 'E0N1',x: 5,y: 24 },store: { getUsedCapacity: () => 50,getFreeCapacity: () => 1000 } };
  const withdraw = vi.fn(() => 0), transfer = vi.fn(() => 0), creep = { id: 'creep',name: 'courier',pos: position,room: { name: 'E0N1' },store: { getUsedCapacity: () => 10,getFreeCapacity: () => 40 },withdraw,transfer } as unknown as Creep;
  vi.stubGlobal('Game',{ time: 1,rooms: { E0N1: room },getObjectById: () => target });
  const move = vi.fn<(creep: Creep,goal: { destination: NativeTransferCommand['position']; range: number }) => { status: 'running' }>(() => ({ status: 'running' })), begin = vi.fn(() => true), execute = createNativeTransfer(createActionArbiter(() => Game.time),{ move },begin);
  const command: NativeTransferCommand = { owner: 'haul',attemptId: 'intent',target: target.id,position: { room: 'E0N1',x: 5,y: 24 },service: { room: 'E0N1',x: 4,y: 24 },resource: 'energy',kind: 'withdraw',maximum: 20,policy: { version: 'test',maximumRooms: 2,costs: {},blockedRooms: [] } };
  return { obstacles,position,target,creep,withdraw,transfer,move,begin,execute,command };
}
test('being adjacent to a target is insufficient when a different exact service tile is bound',() => {
  const f = fixture(); expect(f.execute(f.creep,f.command)).toEqual({ status: 'running' });
  expect(f.move.mock.calls[0]![1]).toMatchObject({ destination: f.command.service,range: 0 }); expect(f.begin).not.toHaveBeenCalled(); expect(f.withdraw).not.toHaveBeenCalled();
  f.position.x = 4; expect(f.execute(f.creep,f.command)).toEqual({ status: 'running' }); expect(f.begin).toHaveBeenCalledTimes(1); expect(f.withdraw).toHaveBeenCalledWith(f.target,'energy',20);
});
test('fixed deposit service also gates transfer; unbound transfers retain ordinary range1 behavior',() => {
  const f = fixture(); expect(f.execute(f.creep,{ ...f.command,kind: 'transfer' })).toEqual({ status: 'running' }); expect(f.transfer).not.toHaveBeenCalled();
  delete f.command.service; expect(f.execute(f.creep,{ ...f.command,kind: 'transfer' })).toEqual({ status: 'running' }); expect(f.transfer).toHaveBeenCalledTimes(1);
});
test('mismatched or statically blocked service geometry issues neither native actions nor journals',() => {
  const f = fixture(); f.command.service = { room: 'W0N1',x: 4,y: 24 }; expect(f.execute(f.creep,f.command)).toMatchObject({ status: 'failed',reason: 'transfer-service-mismatch' });
  f.command.service = { room: 'E0N1',x: 4,y: 24 }; f.obstacles.push({ structureType: 'extension' }); expect(f.execute(f.creep,f.command)).toMatchObject({ status: 'blocked',reason: 'transfer-service-unavailable' });
  expect(f.move).not.toHaveBeenCalled(); expect(f.begin).not.toHaveBeenCalled(); expect(f.withdraw).not.toHaveBeenCalled();
});
test('a moved endpoint invalidates an old service point before any action is journaled',() => {
  const f = fixture(); f.target.pos.x = 9; expect(f.execute(f.creep,f.command)).toMatchObject({ status: 'failed',reason: 'transfer-service-mismatch' }); expect(f.begin).not.toHaveBeenCalled();
});
