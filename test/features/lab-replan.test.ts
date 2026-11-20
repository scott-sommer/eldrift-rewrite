import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createLabMaintenanceOperator } from '../../src/features/operator/lab-maintenance';
import { settleLabReplan } from '../../src/features/industry/lab-replan';
import { reconcileLabAssignment } from '../../src/features/industry/lab-assignment';
import { reconcileLabServices } from '../../src/features/industry/lab-services';
import { createLogisticsRequests } from '../../src/features/logistics/request-store';
import { createQuantityReservations } from '../../src/persistence/quantities/store';
import { logisticsPool } from '../../src/capabilities/logistics/request';
const home = 'W0N1';
function fixture() {
  let memory = {}; const state = createMemoryPort(() => memory);
  const api = createLabMaintenanceOperator(state,name => ['W0N1','W1N1'].includes(name));
  const labs = ['a','b','c'].map(id => ({ id,x: 10,y: 10,mineral: null,amount: 0,free: 3000,cooldown: 0,reactionAmount: 5 }));
  return { state,api,labs,raw: () => JSON.stringify(memory),reset: () => { memory = JSON.parse(JSON.stringify(memory)); } };
}
test('status and empty requests do not initialize state; bulk ownership failure is atomic and intent coalesces across reset',() => {
  const f = fixture(); expect(f.api.replanStatus(home).pending).toBe(false); expect(f.api.requestReplans([]).changed).toBe(false); expect(f.raw()).toBe('{}');
  expect(() => f.api.requestReplans([home,'W2N1'])).toThrow('owned'); expect(f.raw()).toBe('{}');
  expect(f.api.requestReplans(['W1N1',home])).toEqual({ changed: true,requested: [home,'W1N1'] }); f.reset();
  expect(f.api.requestReplan(home).changed).toBe(false); expect(f.api.replanStatus(home).pending).toBe(true);
  expect(settleLabReplan(f.state,home,1)).toBe(true); expect(f.api.replanStatus(home).pending).toBe(false); expect(f.api.replanStatus('W1N1').pending).toBe(true);
  expect(settleLabReplan(f.state,home,2)).toBe(false);
});
test('replan keeps the assignment while admitted supply settles, then retires it without erasing unrelated state',() => {
  const f = fixture(), recipe = { product: 'OH',reagents: ['H','O'] as const };
  const assignment = reconcileLabAssignment(f.state,home,1,f.labs,recipe);
  reconcileLabServices(f.state,home,1,[{ lab: 'a',transfer: { direction: 'refill',source: 'bank',sink: 'a',resource: 'H',quantity: 20 } }],8);
  const queue = createLogisticsRequests(f.state,home), request = queue.pending(1)[0]!, pool = logisticsPool('request',request.owner,request.id);
  const claims = createQuantityReservations(f.state);
  claims.reserve({ id: 'trip',owner: request.owner,holder: 'courier',scope: 'task',expiresAt: 100,allocations: [{ pool,amount: 20 }] },{ [pool]: 20 },1);
  f.state.write('other/room',{ owner: 'other',version: 1,data: { keep: true } }); f.api.requestReplan(home); f.reset();
  expect(settleLabReplan(f.state,home,2)).toBe(true); expect(f.api.replanStatus(home).pending).toBe(true);
  expect(f.state.read('industry-labs/'+home)).toMatchObject({ data: { assignment } }); expect(queue.pending(2)).toHaveLength(1);
  queue.confirm(request.owner,request.id,{ id: 'receipt',amount: 20 },2,1); claims.releaseScope('task'); f.reset();
  expect(settleLabReplan(f.state,home,3)).toBe(true); expect(f.api.replanStatus(home).pending).toBe(false);
  expect(f.state.read('industry-labs/'+home)).toMatchObject({ data: { assignment: null } });
  expect(f.state.read('other/room')).toMatchObject({ data: { keep: true } });
  expect(reconcileLabAssignment(f.state,home,4,f.labs,recipe)).toEqual(assignment);
});
test('future maintenance state and invalid scopes refuse without edits',() => {
  const f = fixture(); expect(() => f.api.requestReplans([home,home])).toThrow('bulk room'); expect(f.raw()).toBe('{}');
  f.state.write('industry-lab-maintenance/empire',{ owner: 'industry',version: 2,data: { pending: [home] } }); const before = f.raw();
  expect(() => f.api.requestReplan(home)).toThrow('future'); expect(() => settleLabReplan(f.state,home,1)).toThrow('future'); expect(f.raw()).toBe(before);
});
