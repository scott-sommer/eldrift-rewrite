import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createLinkJournal } from '../../src/features/logistics/links/journal';
const request = { id: 'link-send', owner: 'links:home', source: 'source', sink: 'sink', resource: 'energy', quantity: 800, priority: 0, expiresAt: 2 };
const event = { source: 'source', sink: 'sink', resource: 'energy', amount: 800 };
function fixture() {
  const memory = {};
  const state = createMemoryPort(() => memory);
  return { state, journal: createLinkJournal(state, 'home') };
}
test('reconstruction settles exactly once from gross engine evidence and derives rounded loss', () => {
  const { state, journal } = fixture();
  expect(journal.prepare(request, 1, 0.03)).toBe(true);
  expect(journal.prepare(request, 1, 0.03)).toBe(false);
  const reset = createLinkJournal(state, 'home');
  reset.settle(2, [{ ...event, amount: 24 }]);
  reset.settle(3, [event]);
  expect(reset.read().entries[0]).toMatchObject({ status: 'confirmed', receipt: { observedAt: 2, sent: 24, receivedAfterLoss: 23 } });
});
test('missing event windows, missing observations and ambiguous evidence never invent receipts', () => {
  for (const [tick, events] of [[3, [event]], [2, undefined], [2, [event, event]], [2, [{ ...event, amount: 801 }]]] as const) {
    const { journal } = fixture();
    journal.prepare(request, 1, 0.03);
    journal.settle(tick, events);
    expect(journal.read().entries[0]).toMatchObject({ status: 'unknown' });
    expect(journal.read().entries[0]?.receipt).toBeUndefined();
  }
});
test('a complete next-tick log distinguishes non-execution from native API rejection', () => {
  const { journal } = fixture();
  journal.prepare(request, 1, 0.03);
  journal.settle(1, []);
  expect(journal.read().entries[0]?.status).toBe('pending');
  journal.settle(2, [{ ...event, sink: 'another' }]);
  expect(journal.read().entries[0]?.status).toBe('not-transferred');
  journal.prepare({ ...request, id: 'rejected' }, 1, 0.03);
  journal.reject('rejected');
  journal.settle(2, [event]);
  expect(journal.read().entries[1]?.status).toBe('rejected');
});
test('bounded history drops settled records but refuses to erase unresolved attempts', () => {
  const { journal } = fixture();
  for (let index = 0; index < 100; index++) journal.prepare({ ...request, id: String(index) }, 1, 0.03);
  expect(journal.prepare({ ...request, id: 'overflow' }, 1, 0.03)).toBe(false);
  journal.reject('0');
  expect(journal.prepare({ ...request, id: 'overflow' }, 1, 0.03)).toBe(true);
  expect(journal.read().discarded).toBe(1);
  expect(journal.read().entries).toHaveLength(100);
  expect(journal.read().entries[0]?.request.id).toBe('1');
});
