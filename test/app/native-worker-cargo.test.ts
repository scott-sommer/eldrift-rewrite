import { createLogisticsRequests } from '../../src/features/logistics/request-store';
import { afterEach, expect, test, vi } from 'vitest';
import { createNativeWorkerCargo } from '../../src/app/native-worker-cargo';
import type { createNativeDispatch } from '../../src/app/native-dispatch';
import { createActionArbiter } from '../../src/core/execution/action-arbiter';
import { defaults } from '../../src/config/model';
import type { Envelope } from '../../src/persistence/versioned-state';
import { assignHaulingTask } from '../../src/app/assign-hauling-task';
import { createTransferJournal } from '../../src/features/logistics/transfer-journal';
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  const records = new Map<string, Envelope>();
  const state = { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => { records.set(key, structuredClone(value)); } };
  vi.stubGlobal('Game', { time: 1, rooms: { W0N1: { find: () => [] } } });
  vi.stubGlobal('FIND_STRUCTURES', 'structures');
  const drop = vi.fn(() => 0);
  const store = { energy: 20, H: 30, getUsedCapacity: (resource?: string) => resource === 'H' ? 30 : resource === 'energy' ? 20 : 50 };
  const creep = { id: 'unit', name: 'worker', store, drop } as unknown as Creep;
  const dispatch = { activate: vi.fn(), arbiter: createActionArbiter(() => Game.time) } as unknown as ReturnType<typeof createNativeDispatch>;
  const cargo = createNativeWorkerCargo(state, dispatch, {});
  return { state, records, creep, drop, cargo };
}
test('worker does not execute or erase an unrelated haul or drop around it', () => {
  const { state, records, creep, drop, cargo } = fixture();
  const request = { id: 'shipment', owner: 'other-owner', source: 'other-source', sink: 'sink', resource: 'H', quantity: 30, priority: 1, expiresAt: 100 };
  createLogisticsRequests(state, 'W0N1').submit(request, 1);
  expect(assignHaulingTask(state, cargo.definitions, 'worker', 'other', { home: 'W0N1', unitId: 'unit', request }, 1, 100)).toBe(true);
  const before = structuredClone(records.get('tasks/worker'));
  expect(cargo.run(creep, 'W0N1', { ...defaults, workersEnabled: true })).toBe(true);
  expect(records.get('tasks/worker')).toEqual(before);
  expect(drop).not.toHaveBeenCalled();
});
test('pending transfer blocks fallback drop, and explicit retention disables fallback', () => {
  const { state, creep, drop, cargo } = fixture();
  const config = { ...defaults, workersEnabled: true };
  cargo.run(creep, 'W0N1', { ...config, workerCargoDropFallback: false });
  expect(drop).not.toHaveBeenCalled();
  createTransferJournal(state, 'unit').begin({ id: 'pending', unit: 'unit', target: 'sink', room: 'W0N1',
    resource: 'H', kind: 'transfer', tick: 1, amount: 30, cargoBefore: 30 });
  cargo.run(creep, 'W0N1', config);
  expect(drop).not.toHaveBeenCalled();
});
