import { expect, test, vi } from 'vitest';
import { paidHaulingStateFixture } from '../../fixtures/paid-hauling-state';
import { createPaidHaulingForecastState } from '../../../src/app/remotes/startup/hauling-state/seed';
import { createHaulingTaskBehavior } from '../../../src/app/hauling-task';
import { createTaskRunner } from '../../../src/app/task-runner';
import { createLogisticsRequests } from '../../../src/features/logistics/request-store';
import { createTransferJournal } from '../../../src/features/logistics/transfer-journal';
import { createQuantityReservations } from '../../../src/persistence/quantities/store';
import { logisticsPool } from '../../../src/capabilities/logistics/request';
import type { HaulingView } from '../../../src/app/hauling-cycle';
function runner(f: ReturnType<typeof paidHaulingStateFixture>, overrides: Partial<HaulingView> = {}) {
  const seeded = createPaidHaulingForecastState('W0N1',11,[f.courier],f.claims);
  const view = { tick: 11,cargo: f.opening.observed.energy,freeCargo: 100-f.opening.observed.energy,sourceStock: 100,sinkFree: 100,sinkPool: logisticsPool('capacity','bank'),...overrides };
  const execute = vi.fn(() => ({ status: 'running' as const }));
  const behavior = createHaulingTaskBehavior(seeded.state,{ identity: () => ({ id: 'native',name: 'courier' }),view: () => view,
    execution: () => ({ observe: () => ({ tick: view.tick,cargo: view.cargo,events: [] }),execute }) });
  const advance = createTaskRunner(seeded.state,{ haul: behavior },() => view.tick);
  return { ...seeded,execute,view,advance: () => advance('courier',{}) };
}

test('past delivery is already receipted in private state; the actual runner acknowledges and completes without another income event', () => {
  const f = paidHaulingStateFixture(),before = JSON.stringify(f),s = runner(f);
  const queue = createLogisticsRequests(s.state,'W0N1');
  expect(queue.findPending('owner','trip',11)).toBeUndefined();
  expect(s.advance()).toEqual({ status: 'done' });
  expect(s.execute).not.toHaveBeenCalled();
  expect(createTransferJournal(s.state,'native').read().acknowledged).toBe(true);
  expect(createQuantityReservations(s.state).list(11)).toEqual([f.claims[1]]);
  const stored = s.state.read('logistics-requests/W0N1');
  expect(stored).toMatchObject({ data: { records: [{ receipts: [{ id: 'attempt',amount: 50 }] }] } });
  expect(JSON.stringify(f)).toBe(before);
  expect(s.advance()).toBeUndefined();
});

test('partial past delivery retains unfinished request and exact task execution state with shared capacity', () => {
  const f = paidHaulingStateFixture('transfer',30,100),s = runner(f,{ sinkFree: 30 });
  expect(createLogisticsRequests(s.state,'W0N1').findPending('owner','trip',11)?.quantity).toBe(50);
  expect(s.advance()).toEqual({ status: 'running' });
  expect(s.execute).toHaveBeenCalledWith(expect.objectContaining({ quantity: 50 }),'deliver',20,expect.any(String),expect.any(String));
  expect(s.state.read('tasks/courier')).toMatchObject({ data: { queue: [{ retries: 2,wakeAt: 11,payload: f.record.payload }] } });
  expect(createQuantityReservations(s.state).list(11).find(claim => claim.holder === 'courier')?.allocations)
    .toEqual([logisticsPool('request','owner','trip'),logisticsPool('capacity','bank')].map(pool => ({ pool,amount: 20 })));
});

test('observed withdrawal drops source claims and retains request quantity; sleeping and empty-stock termination use the real runner', () => {
  const f = paidHaulingStateFixture('withdraw',50),s = runner(f);
  expect(s.advance()).toEqual({ status: 'running' });
  expect(s.execute).toHaveBeenCalledWith(expect.objectContaining({ quantity: 50 }),'deliver',50,expect.any(String),expect.any(String));
  expect(createQuantityReservations(s.state).list(11).find(claim => claim.holder === 'courier')?.allocations).toHaveLength(2);
  const empty = paidHaulingStateFixture('transfer',0,100),waiting = runner(empty,{ sourceStock: 0 });
  expect(waiting.advance()).toEqual({ status: 'done' });
  expect(waiting.execute).not.toHaveBeenCalled();
  const sleeping = paidHaulingStateFixture(); sleeping.opening.observed.task!.record.wakeAt = 15; sleeping.opening.observed.task!.wakeAt = 15; sleeping.opening.continuation.readyAt = 16;
  const asleep = runner(sleeping); expect(asleep.advance()).toMatchObject({ status: 'blocked',reason: 'sleeping',retryAt: 15 });
  expect(createTransferJournal(asleep.state,'native').read().acknowledged).toBe(false);
  asleep.view.tick = 100; expect(asleep.advance()).toMatchObject({ status: 'failed',reason: 'expired' });
});

test('private reads are detached and contradictory opening/progress identities refuse before simulation', () => {
  const f = paidHaulingStateFixture(),s = runner(f);
  const journal = createTransferJournal(s.state,'native').read(); journal.acknowledged = true;
  expect(createTransferJournal(s.state,'native').read().acknowledged).toBe(false);
  expect(() => createPaidHaulingForecastState('W0N1',12,[f.courier],f.claims)).toThrow('clock');
  expect(() => createPaidHaulingForecastState('W0N1',11,[f.courier,f.courier],f.claims)).toThrow('Duplicate');
  f.opening.reflectedEffect!.amount = 49; expect(() => runner(f)).toThrow('result mismatch');
});

test('one shared request merges distinct reflected effects and an already posted effect stays idempotent', () => {
  const f = paidHaulingStateFixture('transfer',0,100), second = structuredClone(f.courier);
  second.opening.observed.name = 'courier-2'; second.opening.observed.unit = 'native-2';
  (second.opening.observed.task!.record.payload as { unitId: string }).unitId = 'native-2';
  second.opening.observed.journal!.attempt!.unit = 'native-2'; second.opening.observed.journal!.attempt!.id = 'attempt-2';
  second.opening.reflectedEffect!.id = 'attempt-2';
  const joined = createPaidHaulingForecastState('W0N1',11,[f.courier,second],[]);
  expect(createLogisticsRequests(joined.state,'W0N1').findPending('owner','trip',11)).toBeUndefined();
  expect(joined.state.read('logistics-requests/W0N1')).toMatchObject({ data: { records: [{ receipts: [{ id: 'attempt',amount: 50 },{ id: 'attempt-2',amount: 50 }] }] } });
  f.opening.observed.task!.receipts.push({ id: 'attempt',amount: 50 }); f.opening.observed.task!.remaining = 50; f.opening.reflectedEffect!.postedAmount = 50;
  const posted = runner(f);
  expect(posted.state.read('logistics-requests/W0N1')).toMatchObject({ data: { records: [{ receipts: [{ id: 'attempt',amount: 50 }] }] } });
  expect(createLogisticsRequests(posted.state,'W0N1').findPending('owner','trip',11)?.quantity).toBe(50);
});
