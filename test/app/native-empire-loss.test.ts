import { afterEach, expect, test, vi } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { lostEmpireRoomSettled, maintainLostEmpireSupply } from '../../src/app/native-empire-loss';
import { empireRoomSettled } from '../../src/app/native-empire-lab-facts';
import { reconcileLabServices } from '../../src/features/industry/lab-services';
import { createLogisticsRequests } from '../../src/features/logistics/request-store';
import { createQuantityReservations } from '../../src/persistence/quantities/store';
import { logisticsPool } from '../../src/capabilities/logistics/request';
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  let memory = {}; const state = createMemoryPort(() => memory), game = { time: 2,rooms: { W0N1: { controller: { my: false } } } as Record<string,unknown>,creeps: {} as Record<string,unknown> };
  vi.stubGlobal('Game',game);
  return { state,game,reset: () => { memory = JSON.parse(JSON.stringify(memory)); } };
}
test('unseen controllers never authorize loss release or erase retained industry assignment',() => {
  const f = fixture(); delete f.game.rooms.W0N1;
  f.state.write('industry-labs/W0N1',{ owner: 'industry',version: 1,data: { assignment: null } }); const before = f.state.read('industry-labs/W0N1');
  maintainLostEmpireSupply(f.state,['W0N1']); expect(lostEmpireRoomSettled(f.state,'W0N1')).toBe(false);
  f.reset(); expect(empireRoomSettled(f.state,'W0N1')).toBe(false); expect(f.state.read('industry-labs/W0N1')).toEqual(before);
});
test('confirmed loss cancels unclaimed reaction supply and preserves unrelated services and state',() => {
  const f = fixture(); reconcileLabServices(f.state,'W0N1',1,[{ lab: 'lab',transfer: { direction: 'refill',source: 'bank',sink: 'lab',resource: 'H',quantity: 10 } }],8);
  const queue = createLogisticsRequests(f.state,'W0N1'); queue.submit({ id: 'other',owner: 'other',source: 'a',sink: 'b',resource: 'energy',quantity: 10,priority: 1,expiresAt: 100 },1);
  const assignment = { product: 'OH',reagents: ['H','O'],inputs: ['a','b'],outputs: ['c'],roster: ['a','b','c'] };
  f.state.write('industry-labs/W0N1',{ owner: 'industry',version: 1,data: { assignment } });
  maintainLostEmpireSupply(f.state,['W0N1']); expect(queue.pending(2).map(item => item.owner)).toEqual(['other']);
  expect(empireRoomSettled(f.state,'W0N1')).toBe(true); expect(f.state.read('industry-labs/W0N1')).toMatchObject({ data: { assignment } });
});
test('admitted claims and surviving home actors independently fence confirmed ownership loss',() => {
  const f = fixture(); reconcileLabServices(f.state,'W0N1',1,[{ lab: 'lab',transfer: { direction: 'refill',source: 'bank',sink: 'lab',resource: 'H',quantity: 10 } }],8);
  const queue = createLogisticsRequests(f.state,'W0N1'), request = queue.pending(2)[0]!, pool = logisticsPool('request',request.owner,request.id), claims = createQuantityReservations(f.state);
  claims.reserve({ id: 'trip',owner: request.owner,holder: 'courier',scope: 'task',expiresAt: 100,allocations: [{ pool,amount: 10 }] },{ [pool]: 10 },1);
  maintainLostEmpireSupply(f.state,['W0N1']); expect(queue.pending(2)).toHaveLength(1); expect(lostEmpireRoomSettled(f.state,'W0N1')).toBe(false);
  f.game.creeps.courier = { my: true,memory: { population: { home: 'W0N1' } } }; claims.releaseScope('task'); f.reset();
  expect(lostEmpireRoomSettled(f.state,'W0N1')).toBe(false); delete f.game.creeps.courier;
  maintainLostEmpireSupply(f.state,['W0N1']); expect(queue.pending(2)).toEqual([]); expect(lostEmpireRoomSettled(f.state,'W0N1')).toBe(true);
});
test('visible owned rooms still require ordinary assignment retirement',() => {
  const f = fixture(); f.game.rooms.W0N1 = { controller: { my: true } };
  expect(lostEmpireRoomSettled(f.state,'W0N1')).toBe(false); expect(empireRoomSettled(f.state,'W0N1')).toBe(true);
});
