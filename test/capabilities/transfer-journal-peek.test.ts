import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createTransferJournal } from '../../src/features/logistics/transfer-journal';
import { settleHaulingTask } from '../../src/app/settle-hauling-task';

test('read-only journal lookup does not initialize absent transfer or task state',() => {
  const root = {}, state = createMemoryPort(() => root), journal = createTransferJournal(state,'unit');
  expect(journal.peek()).toBeUndefined();
  settleHaulingTask(state,{}, { id: 'unit',name: 'courier' },() => { throw new Error('No pending transfer'); });
  expect(root).toEqual({});
});
test('journal lookup retains pending evidence and returns isolated current snapshots',() => {
  const root = {}, state = createMemoryPort(() => root), journal = createTransferJournal(state,'unit');
  journal.begin({ id: 'prior',unit: 'unit',target: 'sink',room: 'W0N1',resource: 'energy',kind: 'transfer',tick: 1,amount: 10,cargoBefore: 10 });
  const view = journal.peek()!; expect(view.acknowledged).toBe(false);
  view.attempt!.amount = 1;
  expect(journal.peek()!.attempt!.amount).toBe(10);
  journal.settle({ tick: 2,events: [{ source: 'unit',target: 'sink',resource: 'energy',amount: 10 }] });
  journal.acknowledge('prior');
  expect(journal.peek()).toMatchObject({ acknowledged: true,result: { status: 'observed',amount: 10 } });
  settleHaulingTask(state,{}, { id: 'unit',name: 'courier' },() => { throw new Error('Already settled'); });
  expect(state.read('tasks/courier')).toBeUndefined();
});
