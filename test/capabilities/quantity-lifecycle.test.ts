import { expect, test } from 'vitest';
import { createQuantityReservations } from '../../src/persistence/quantities/store';
import { createReservationCleanup } from '../../src/persistence/reservation-cleanup';
import { cancelTask } from '../../src/app/cancel-task';
import { taskScope } from '../../src/app/task-runner';
import { retireUnitTasks } from '../../src/persistence/tasks/retire';
import { createTickAdmission } from '../../src/app/tick-admission';
import type { Envelope } from '../../src/persistence/versioned-state';
function fixture() {
  const records = new Map<string, Envelope>();
  const port = { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => { records.set(key, value); } };
  const ledger = createQuantityReservations(port);
  const book = (name: string, expiresAt = 10) => ledger.reserve({ id: name, owner: 'logistics', holder: name,
    scope: taskScope(name, 'haul'), expiresAt, allocations: [{ pool: 'capacity', amount: 10 }] }, { capacity: 100 }, 1);
  return { records, port, ledger, book };
}
test('task cancellation and unit retirement release quantity claims through shared cleanup', () => {
  const { port, ledger, book } = fixture();
  book('cancelled'); book('dead'); book('survivor');
  cancelTask(port, 'cancelled', 'haul', {});
  retireUnitTasks(port, 'dead', {});
  expect(ledger.list(1).map(claim => claim.holder)).toEqual(['survivor']);
});
test('tick admission expires quantities without creating unused exclusive reservation state', () => {
  const { records, port, ledger, book } = fixture();
  book('expired', 2); book('live');
  expect(createTickAdmission(port, () => true, () => 2)()).toBe(true);
  expect(ledger.list(2).map(claim => claim.holder)).toEqual(['live']);
  expect(records.has('reservations/empire')).toBe(false);
});
test('cleanup of unused stores is side-effect free', () => {
  const { records, port } = fixture();
  expect(createReservationCleanup(port).releaseHolder('absent')).toBe(0);
  expect(records.size).toBe(0);
});
