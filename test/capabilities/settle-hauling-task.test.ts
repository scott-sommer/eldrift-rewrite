import { expect, test } from 'vitest';
import { settleHaulingTask } from '../../src/app/settle-hauling-task';
import { assignHaulingTask } from '../../src/app/assign-hauling-task';
import { createHaulingTaskBehavior } from '../../src/app/hauling-task';
import { createTaskRunner } from '../../src/app/task-runner';
import { createLogisticsRequests } from '../../src/features/logistics/request-store';
import { createTransferJournal } from '../../src/features/logistics/transfer-journal';
import { logisticsPool } from '../../src/capabilities/logistics/request';
import type { Envelope } from '../../src/persistence/versioned-state';
test('withdrawal confirmation survives task expiry without dispatching new work', () => {
  const records = new Map<string, Envelope>();
  const state = { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => { records.set(key, structuredClone(value)); } };
  const request = { id: 'old', owner: 'room', source: 'source', sink: 'sink', resource: 'energy', quantity: 20, priority: 0, expiresAt: 2 };
  createLogisticsRequests(state, 'home').submit(request, 1);
  const unit = { id: 'creep-id', name: 'courier' };
  const definitions = { haul: createHaulingTaskBehavior(state, { identity: () => unit,
    view: () => { throw new Error('Expired task must not execute'); }, execution: () => { throw new Error('No intents'); } }) };
  assignHaulingTask(state, definitions, unit.name, 'task', { home: 'home', unitId: unit.id, request }, 1, 2);
  const journal = createTransferJournal(state, unit.id);
  journal.begin({ id: 'intent', requestKey: logisticsPool('request-binding', 'home', request.owner, request.id),
    unit: unit.id, target: 'source', room: 'home', resource: 'energy', kind: 'withdraw', tick: 1, amount: 20, cargoBefore: 0 });
  settleHaulingTask(state, definitions, unit, () => ({ tick: 2, cargo: 20,
    events: [{ source: 'source', target: unit.id, resource: 'energy', amount: 20 }] }));
  expect(journal.read()).toMatchObject({ acknowledged: true, result: { status: 'observed', amount: 20 } });
  expect(createTaskRunner(state, definitions, () => 2)(unit.name, unit)).toMatchObject({ status: 'failed' });
  expect((records.get('tasks/courier')?.data as { queue: unknown[] }).queue).toEqual([]);
  settleHaulingTask(state, definitions, unit, () => { throw new Error('Must not settle twice'); });
});
