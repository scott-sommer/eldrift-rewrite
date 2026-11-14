import { logisticsPool } from '../../src/capabilities/logistics/request';
import { expect, test } from 'vitest';
import { settleHaulingTransfer } from '../../src/app/settle-hauling-transfer';
import { createTransferJournal } from '../../src/features/logistics/transfer-journal';
import { createLogisticsRequests } from '../../src/features/logistics/request-store';
import type { Envelope } from '../../src/persistence/versioned-state';
import type { TransferAttempt } from '../../src/capabilities/logistics/confirmation';
const request = { id: 'fill', owner: 'economy', source: 'source', sink: 'sink', resource: 'energy', quantity: 100, priority: 0, expiresAt: 50 };
const attempt: TransferAttempt = { id: 'unit:tick1', requestKey: logisticsPool('request-binding', 'W0N0', 'economy', 'fill'), unit: 'unit', target: 'sink', room: 'W0N0', resource: 'energy', kind: 'transfer', tick: 1, amount: 50, cargoBefore: 50 };
const binding = { home: 'W0N0', unit: 'unit', request };
const observation = { tick: 2, cargo: 20, events: [{ source: 'unit', target: 'sink', resource: 'energy', amount: 30 }] };
function fixture() {
  const records = new Map<string, Envelope>();
  let failure = '';
  const port = { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => {
    if (failure && key.startsWith(failure)) { failure = ''; throw new Error('Interrupted write'); }
    records.set(key, JSON.parse(JSON.stringify(value)) as Envelope);
  } };
  const queue = createLogisticsRequests(port, 'W0N0');
  queue.submit(request, 1);
  createTransferJournal(port, 'unit').begin(attempt);
  return { port, queue, fail: (prefix: string) => { failure = prefix; } };
}
test('receipt commits before reconciliation; interrupted reconciliation replays without double delivery', () => {
  const { port, queue } = fixture();
  expect(() => settleHaulingTransfer(port, binding, observation, () => { throw new Error('interrupted'); })).toThrow();
  expect(queue.pending(2)[0]!.quantity).toBe(70);
  expect(createTransferJournal(port, 'unit').read().acknowledged).toBe(false);
  let reconciled = 0;
  expect(settleHaulingTransfer(port, binding, { tick: 3 }, () => { reconciled++; })).toEqual({ status: 'observed', amount: 30 });
  expect(queue.pending(3)[0]!.quantity).toBe(70);
  expect(reconciled).toBe(1);
  expect(settleHaulingTransfer(port, binding, { tick: 4 }, () => { reconciled++; })).toBeNull();
  expect(reconciled).toBe(1);
});
test('receipt write failure retains confirmation for a later retry', () => {
  const { port, queue, fail } = fixture();
  fail('logistics-requests/');
  expect(() => settleHaulingTransfer(port, binding, observation, () => {})).toThrow('Interrupted write');
  expect(queue.pending(2)[0]!.quantity).toBe(100);
  settleHaulingTransfer(port, binding, { tick: 3 }, () => {});
  expect(queue.pending(3)[0]!.quantity).toBe(70);
});
test('unknown outcomes reconcile without manufacturing delivery receipts', () => {
  const { port, queue } = fixture();
  const result = settleHaulingTransfer(port, binding, { tick: 3 }, (_attempt, evidence) => {
    expect(evidence.status).toBe('unknown');
  });
  expect(result).toEqual({ status: 'unknown' });
  expect(queue.pending(3)[0]!.quantity).toBe(100);
});
test('mismatched target cannot settle against another request', () => {
  const { port, queue } = fixture();
  expect(() => settleHaulingTransfer(port, { ...binding, request: { ...request, sink: 'other' } }, observation, () => {})).toThrow();
  expect(queue.pending(2)[0]!.quantity).toBe(100);
});

test('another request with the same endpoints cannot claim a pending delivery', () => {
  const { port, queue } = fixture();
  expect(() => settleHaulingTransfer(port, { ...binding, request: { ...request, id: 'other-request' } }, observation, () => {})).toThrow();
  expect(queue.pending(2)[0]!.quantity).toBe(100);
});

