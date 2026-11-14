import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createLogisticsRequests } from '../../src/features/logistics/request-store';
import { createQuantityReservations } from '../../src/persistence/quantities/store';
import { logisticsPool } from '../../src/capabilities/logistics/request';
import { reconcileLinkService } from '../../src/features/logistics/links/service-requests';
const fill = { direction: 'fill' as const, source: 'storage', sink: 'link', quantity: 200 };
const drain = { direction: 'drain' as const, source: 'link', sink: 'storage', quantity: 200 };
function fixture() {
  const memory = {};
  const state = createMemoryPort(() => memory);
  return { state, queue: createLogisticsRequests(state, 'home'), ledger: createQuantityReservations(state) };
}
test('repeated observations keep one request; unassigned work reverses or retires with policy', () => {
  const f = fixture();
  reconcileLinkService(f.state, 'home', 1, fill);
  reconcileLinkService(f.state, 'home', 2, fill);
  expect(f.queue.pending(2)).toHaveLength(1);
  reconcileLinkService(f.state, 'home', 3, drain);
  expect(f.queue.pending(3)).toMatchObject([{ source: 'link', sink: 'storage' }]);
  reconcileLinkService(f.state, 'home', 4, undefined);
  expect(f.queue.pending(4)).toEqual([]);
});
test('admitted cargo keeps its direction until delivery settles before opposite work is created', () => {
  const f = fixture();
  reconcileLinkService(f.state, 'home', 1, fill);
  const request = f.queue.pending(1)[0]!;
  const pool = logisticsPool('request', request.owner, request.id);
  f.ledger.reserve({ id: 'task', scope: 'task', owner: request.owner, holder: 'courier', expiresAt: 10,
    allocations: [{ pool, amount: 200 }] }, { [pool]: 200 }, 1);
  reconcileLinkService(f.state, 'home', 2, drain);
  expect(f.queue.pending(2)).toEqual([request]);
  f.queue.confirm(request.owner, request.id, { id: 'receipt', amount: 200 }, 3);
  f.ledger.releaseScope('task');
  reconcileLinkService(f.state, 'home', 3, drain);
  expect(f.queue.pending(3)).toMatchObject([{ source: 'link', sink: 'storage' }]);
});
test('lower feasible batch replaces stale unassigned quantity', () => {
  const f = fixture();
  reconcileLinkService(f.state, 'home', 1, fill);
  reconcileLinkService(f.state, 'home', 2, { ...fill, quantity: 20 });
  expect(f.queue.pending(2)).toMatchObject([{ quantity: 20 }]);
});
