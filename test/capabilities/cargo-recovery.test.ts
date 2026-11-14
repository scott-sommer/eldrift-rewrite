import { expect, test } from 'vitest';
import { assignCargoRecovery } from '../../src/app/assign-cargo-recovery';
import { validHaulingPayload } from '../../src/app/hauling-task';
import { createLogisticsRequests } from '../../src/features/logistics/request-store';
import { createQuantityReservations } from '../../src/persistence/quantities/store';
import { createTransferJournal } from '../../src/features/logistics/transfer-journal';
import type { Envelope } from '../../src/persistence/versioned-state';
const definitions = { haul: { phases: ['work'], validPayload: validHaulingPayload } };
const cargo = { home: 'home', name: 'one', unitId: 'one-id', tick: 1, resource: 'energy', quantity: 20, sink: 'storage', sinkFree: 25, sinkPool: 'storage-capacity' };
function fixture() {
  const records = new Map<string, Envelope>();
  return { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => { records.set(key, structuredClone(value)); } };
}
test('cargo recovery reserves only delivery capacity and splits work to the remaining shared capacity', () => {
  const state = fixture();
  expect(assignCargoRecovery(state, definitions, cargo)).toBe(true);
  expect(assignCargoRecovery(state, definitions, cargo)).toBe(false);
  expect(assignCargoRecovery(state, definitions, { ...cargo, name: 'two', unitId: 'two-id' })).toBe(true);
  expect(assignCargoRecovery(state, definitions, { ...cargo, name: 'three', unitId: 'three-id' })).toBe(false);
  expect(createLogisticsRequests(state, 'home').pending(1).map(request => request.quantity).sort((a, b) => a - b)).toEqual([5, 20]);
  expect(createQuantityReservations(state).list(1).every(claim => claim.allocations.length === 2)).toBe(true);
});
test('recovery does not overwrite pending or uncertain transfer evidence', () => {
  const state = fixture();
  const journal = createTransferJournal(state, cargo.unitId);
  journal.begin({ id: 'old', unit: cargo.unitId, target: 'source', room: 'home', resource: 'energy', kind: 'withdraw', tick: 1, amount: 20, cargoBefore: 0 });
  expect(assignCargoRecovery(state, definitions, { ...cargo, tick: 2 })).toBe(false);
  expect(journal.settle({ tick: 3, cargo: 20 })).toEqual({ status: 'unknown' });
  journal.acknowledge('old');
  expect(assignCargoRecovery(state, definitions, { ...cargo, tick: 3 })).toBe(false);
  expect(journal.read().attempt?.id).toBe('old');
});
