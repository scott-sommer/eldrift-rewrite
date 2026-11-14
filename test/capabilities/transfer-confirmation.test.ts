import { expect, test } from 'vitest';
import { confirmTransfer } from '../../src/capabilities/logistics/confirmation';
import { createTransferJournal } from '../../src/features/logistics/transfer-journal';
import type { TransferAttempt } from '../../src/capabilities/logistics/confirmation';
import type { Envelope } from '../../src/persistence/versioned-state';
const attempt: TransferAttempt = { id: 'delivery-1', unit: 'creep-id', target: 'store-id', room: 'W0N0', resource: 'energy', kind: 'transfer', tick: 1, amount: 50, cargoBefore: 50 };
test('native transfer evidence distinguishes partial delivery from unrelated cargo loss', () => {
  expect(confirmTransfer(attempt, { tick: 2, cargo: 0, events: [] })).toEqual({ status: 'observed', amount: 0 });
  expect(confirmTransfer(attempt, { tick: 2, cargo: 20, events: [{ source: 'creep-id', target: 'store-id', resource: 'energy', amount: 30 }] }))
    .toEqual({ status: 'observed', amount: 30 });
  expect(confirmTransfer(attempt, { tick: 3, events: [] })).toEqual({ status: 'unknown' });
  expect(confirmTransfer(attempt, { tick: 2 })).toEqual({ status: 'unknown' });
});
test('withdraw reverses native event endpoints; pickup uses bounded cargo increase', () => {
  expect(confirmTransfer({ ...attempt, kind: 'withdraw' }, { tick: 2, events: [{ source: 'store-id', target: 'creep-id', resource: 'energy', amount: 20 }] }))
    .toEqual({ status: 'observed', amount: 20 });
  expect(confirmTransfer({ ...attempt, kind: 'pickup', cargoBefore: 0 }, { tick: 2, cargo: 30, events: [] })).toEqual({ status: 'observed', amount: 30 });
  expect(confirmTransfer({ ...attempt, kind: 'pickup', cargoBefore: 0 }, { tick: 2, cargo: 60, events: [] })).toEqual({ status: 'unknown' });
});
test('journal prevents duplicate invocation after reset and persists confirmation for receipt replay', () => {
  const records = new Map<string, Envelope>();
  const port = { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => { records.set(key, value); } };
  const journal = createTransferJournal(port, attempt.unit);
  expect(journal.begin(attempt)).toBe(true);
  const reset = createTransferJournal(port, attempt.unit);
  expect(reset.begin(attempt)).toBe(false);
  expect(reset.settle({ tick: 1 })).toEqual({ status: 'waiting' });
  const result = reset.settle({ tick: 2, events: [{ source: 'creep-id', target: 'store-id', resource: 'energy', amount: 30 }] });
  expect(result).toEqual({ status: 'observed', amount: 30 });
  expect(reset.settle({ tick: 3 })).toEqual(result);
  expect(reset.begin(attempt)).toBe(false);
  expect(reset.begin({ ...attempt, id: 'next', tick: 2 })).toBe(false);
  reset.acknowledge(attempt.id);
  expect(reset.begin({ ...attempt, id: 'next', tick: 2 })).toBe(true);
});


