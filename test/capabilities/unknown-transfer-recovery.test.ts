import { recordUncertainTransfer } from '../../src/features/logistics/uncertainty';
import { expect, test } from 'vitest';
import { abandonUnknownTransfer } from '../../src/app/abandon-unknown-transfer';
import { createLogisticsRequests } from '../../src/features/logistics/request-store';
import { createTransferJournal } from '../../src/features/logistics/transfer-journal';
import { logisticsPool } from '../../src/capabilities/logistics/request';
import type { Envelope } from '../../src/persistence/versioned-state';
const request = { id: 'request', owner: 'owner', source: 'source', sink: 'sink', resource: 'energy', quantity: 20, priority: 0, expiresAt: 100 };
const binding = { home: 'home', unit: 'creep', holder: 'courier', scope: 'task', request };
function fixture() {
  const records = new Map<string, Envelope>();
  const state = { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => { records.set(key, structuredClone(value)); } };
  createLogisticsRequests(state, 'home').submit(request, 1);
  const journal = createTransferJournal(state, 'creep');
  journal.begin({ id: 'attempt', requestKey: logisticsPool('request-binding', 'home', request.owner, request.id), unit: 'creep', target: 'sink',
    room: 'home', resource: 'energy', kind: 'transfer', tick: 1, amount: 20, cargoBefore: 20 });
  journal.settle({ tick: 3, cargo: 0 });
  journal.acknowledge('attempt');
  return { state, records, journal };
}
test('unknown delivery is archived and cancelled without inferring a receipt from lost cargo', () => {
  const { state, records, journal } = fixture();
  expect(abandonUnknownTransfer(state, binding, 3, 0)).toBe(true);
  expect(journal.read()).toEqual({ acknowledged: true, attempt: null, result: null });
  expect(createLogisticsRequests(state, 'home').pending(3)).toEqual([]);
  expect(records.get('logistics-requests/home')?.data).toMatchObject({ records: [{ cancelled: true, receipts: [] }] });
  expect(records.get('logistics-uncertainty/creep')?.data).toMatchObject({ entries: [{ attempt: { id: 'attempt' }, cargo: 0 }], discarded: 0 });
  expect(abandonUnknownTransfer(state, binding, 4, 0)).toBe(false);
});
test('interrupted cancellation keeps the journal and work intact; retry does not duplicate the incident', () => {
  const { state, records, journal } = fixture();
  const fault = { ...state, write: (key: string, value: Envelope) => {
    if (key === 'logistics-requests/home') throw new Error('cancel failed');
    state.write(key, value);
  } };
  expect(() => abandonUnknownTransfer(fault, binding, 3, 0)).toThrow('cancel failed');
  expect(journal.read()).toMatchObject({ attempt: { id: 'attempt' }, result: { status: 'unknown' } });
  expect(createLogisticsRequests(state, 'home').pending(3)).toHaveLength(1);
  expect(abandonUnknownTransfer(state, binding, 4, 0)).toBe(true);
  expect((records.get('logistics-uncertainty/creep')?.data as { entries: unknown[] }).entries).toHaveLength(1);
});


test('incident detail retention is bounded and records how many older entries were discarded', () => {
  const { state, records, journal } = fixture();
  const attempt = journal.read().attempt!;
  for (let index = 0; index < 11; index++) recordUncertainTransfer(state, {
    attempt: { ...attempt, id: String(index) }, request, home: 'home', scope: 'task', tick: 3, cargo: 0,
  });
  const incidents = records.get('logistics-uncertainty/creep')!.data as { entries: { attempt: { id: string } }[]; discarded: number };
  expect(incidents.entries).toHaveLength(10);
  expect(incidents.entries[0]!.attempt.id).toBe('1');
  expect(incidents.discarded).toBe(1);
});

test('acknowledged unknown evidence cannot be overwritten by another attempt before explicit retirement',() => {
  const { state,records,journal } = fixture(), previous = journal.read().attempt!;
  const next = { ...previous,id: 'next',requestKey: logisticsPool('request-binding','home','owner','replacement'),kind: 'withdraw' as const,target: 'source',tick: 4,cargoBefore: 0 };
  const before = JSON.stringify([...records]); expect(journal.begin(next)).toBe(false); expect(JSON.stringify([...records])).toBe(before);
  expect(abandonUnknownTransfer(state,binding,3,0)).toBe(true); expect(journal.begin(next)).toBe(true);
});
