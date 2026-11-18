import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createObservationStore } from '../../src/features/intel/observation/store';
import { refreshObservations } from '../../src/features/intel/observation/refresh';
import { dispatchObservations, settleObservations } from '../../src/features/intel/observation/cycle';
import { observerDefaults } from '../../src/config/observers';
test('ordered rotation survives recreation, skips standing requests, and rate limits completed refreshes', () => {
  const root = {}, port = createMemoryPort(() => root), store = createObservationStore(port);
  const config = { ...observerDefaults, observersEnabled: true, observerAssignedRooms: ['E0N1','W2N1'], observerRefreshInterval: 10 };
  expect(refreshObservations('W0N1', config, 1, 1, store, () => true).submitted).toBe(true);
  expect(refreshObservations('W0N1', config, 1, 1, createObservationStore(port), () => true).submitted).toBe(true);
  const ports = { store, capture: () => true, issue: () => 0, failure: () => {} }, budget = { captures: 1, issues: 1, scans: 32 };
  dispatchObservations(1, budget, [{ id: 'observer', home: 'W0N1' }], ports, () => true, () => true);
  settleObservations(2, budget, ports, () => true);
  expect(refreshObservations('W0N1', config, 2, 2, store, () => true).submitted).toBe(false);
  expect(refreshObservations('W0N1', config, 12, 2, store, () => true).submitted).toBe(true);
});
test('disabled, empty, zero-read or denied refresh creates no feature namespace', () => {
  const root = {}, store = createObservationStore(createMemoryPort(() => root));
  const config = { ...observerDefaults, observerAssignedRooms: ['E0N1'] };
  refreshObservations('W0N1', config, 1, 10, store, () => true);
  refreshObservations('W0N1', { ...config, observersEnabled: true }, 1, 0, store, () => true);
  refreshObservations('W0N1', { ...config, observersEnabled: true }, 1, 10, store, () => false);
  refreshObservations('W0N1', { ...config, observersEnabled: true, observerAssignedRooms: [] }, 1, 10, store, () => true);
  expect(root).toEqual({});
});

test('a successful one-room assignment can request continuous next-tick vision at interval one', () => {
  const root = {}, store = createObservationStore(createMemoryPort(() => root));
  const config = { ...observerDefaults, observersEnabled: true, observerAssignedRooms: ['E0N1'] };
  const ports = { store, capture: () => true, issue: () => 0, failure: () => {} }, budget = { captures: 1, issues: 1, scans: 32 };
  for (let tick = 1; tick <= 5; tick++) {
    settleObservations(tick, budget, ports, () => true);
    expect(refreshObservations('W0N1', config, tick, 32, store, () => true).submitted).toBe(true);
    expect(dispatchObservations(tick, budget, [{ id: 'observer', home: 'W0N1' }], ports, () => true, () => true).issues).toBe(1);
  }
  expect(store.read().receipts.map(receipt => receipt.completedAt)).toEqual([2,3,4,5]);
});
