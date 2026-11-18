import { expect, test } from 'vitest';
import { submitHaulingTask } from '../../src/app/submit-hauling-task';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { validHaulingPayload } from '../../src/app/hauling-task';
import { createLogisticsRequests } from '../../src/features/logistics/request-store';
import { createQuantityReservations } from '../../src/persistence/quantities/store';
import { createTransferJournal } from '../../src/features/logistics/transfer-journal';
import { openState } from '../../src/persistence/versioned-state';
import { taskSchema } from '../../src/persistence/tasks/schema';
const definitions = { haul: { phases: ['work'],validPayload: validHaulingPayload } };
function fixture() {
  const root = {}, state = createMemoryPort(() => root);
  const offer = (name: string, minimumCollection = 10) => ({ home: 'W0N1',name,unitId: name,tick: 1,phase: 'collect' as const,maximum: 60,sinkRoom: 'W0N1',
    request: { id: 'trip-' + name,owner: 'remote',source: 'source',sink: 'sink',resource: 'energy',quantity: 60,priority: 0,expiresAt: 100 },
    available: { sourceStock: 100,sinkFree: 80,sinkPool: 'sink-pool',minimumCollection } });
  return { root,state,offer };
}
test('atomic new tasks share source and sink pools and publish only their actually reserved quantity', () => {
  const f = fixture(), first = f.offer('one'), second = f.offer('two');
  expect(submitHaulingTask(f.state,definitions,first)).toBe(true);
  expect(submitHaulingTask(f.state,definitions,second)).toBe(true);
  expect(createLogisticsRequests(f.state,'W0N1').pending(1).map(request => request.quantity)).toEqual([60,20]);
  expect(second.request.quantity).toBe(60);
  expect(submitHaulingTask(f.state,definitions,f.offer('three'))).toBe(false);
  expect(createLogisticsRequests(f.state,'W0N1').pending(1)).toHaveLength(2);
  expect(createQuantityReservations(f.state).list(1)).toHaveLength(2);
});
test('minimum collection and pending confirmation prevent unusable new requests', () => {
  const f = fixture(); submitHaulingTask(f.state,definitions,f.offer('one'));
  expect(submitHaulingTask(f.state,definitions,f.offer('two',30))).toBe(false);
  expect(createLogisticsRequests(f.state,'W0N1').pending(1)).toHaveLength(1);
  createTransferJournal(f.state,'two').begin({ id: 'unsettled',unit: 'two',target: 'sink',room: 'W0N1',resource: 'energy',kind: 'transfer',tick: 1,amount: 10,cargoBefore: 10 });
  expect(submitHaulingTask(f.state,definitions,f.offer('two'))).toBe(false);
});
test('failed task persistence cancels published work and rolls back only its booking', () => {
  const f = fixture(), bad = { haul: { phases: ['work'],validPayload: () => false } };
  expect(() => submitHaulingTask(f.state,bad,f.offer('one'))).toThrow('invalid state');
  expect(createLogisticsRequests(f.state,'W0N1').pending(1)).toEqual([]);
  expect(createQuantityReservations(f.state).list(1)).toEqual([]);
  expect(openState(f.state,'tasks/one',taskSchema('one',bad)).queue).toEqual([]);
});
