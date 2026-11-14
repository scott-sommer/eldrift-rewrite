import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { issueCollection } from '../../src/features/logistics/collect-intent';
import { createQuantityReservations } from '../../src/persistence/quantities/store';
import { logisticsPool } from '../../src/capabilities/logistics/request';
const intent = { owner: 'worker-task', holder: 'worker', sink: 'worker-id', source: 'container', resource: 'energy',
  stock: 100, free: 50, maximum: 50, minimum: 0, sinkPool: logisticsPool('capacity', 'worker-id') };
function fixture(pool: string, amount: number) {
  const state = createMemoryPort(() => memory);
  const memory = {};
  const ledger = createQuantityReservations(state);
  ledger.reserve({ id: 'courier', owner: 'courier', holder: 'courier', scope: 'courier-task', expiresAt: 10,
    allocations: [{ pool, amount }] }, { [pool]: 100 }, 1);
  return { state, ledger };
}
test('collection shares courier stock and incoming capacity and retains issued claims until next tick', () => {
  const { state, ledger } = fixture(logisticsPool('stock', 'container', 'energy'), 80);
  let observed = 0;
  expect(issueCollection(state, 1, intent, amount => { observed = amount; return { status: 'issued', code: 0 }; })?.status).toBe('issued');
  expect(observed).toBe(20);
  expect(issueCollection(state, 1, intent, () => { throw new Error('duplicate intent'); })).toBeUndefined();
  expect(ledger.list(1)).toHaveLength(2);
  expect(ledger.list(2)).toHaveLength(1);
  const incoming = fixture(intent.sinkPool, 30);
  issueCollection(incoming.state, 1, intent, amount => { expect(amount).toBe(20); return { status: 'issued', code: 0 }; });
});
test('unbounded pickups reject partial capacity and rejected intents release only their own booking', () => {
  const { state, ledger } = fixture(intent.sinkPool, 30);
  expect(issueCollection(state, 1, { ...intent, minimum: 50 }, () => { throw new Error('partial pickup'); })).toBeUndefined();
  expect(issueCollection(state, 1, intent, () => ({ status: 'rejected', code: -6 }))?.status).toBe('rejected');
  expect(ledger.list(1).map(claim => claim.id)).toEqual(['courier']);
});
test('uncertain throws retain collection claims so a second invocation cannot overbook', () => {
  const { state, ledger } = fixture(intent.sinkPool, 1);
  expect(() => issueCollection(state, 1, intent, () => { throw new Error('unknown native outcome'); })).toThrow('unknown native');
  expect(ledger.list(1)).toHaveLength(2);
  expect(issueCollection(state, 1, intent, () => ({ status: 'issued', code: 0 }))).toBeUndefined();
});
