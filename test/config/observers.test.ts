import { expect, test } from 'vitest';
import { resolveConfig } from '../../src/config/resolve';
test('observer room policy layers detach ordered assignments while action/capture budgets remain empire-owned', () => {
  const rooms = ['E0N1','W2N1'];
  const values = resolveConfig({ empire: { observersEnabled: true, observerVisionBudget: 2 },
    roomOverride: { observerAssignedRooms: rooms, observerRefreshInterval: 10 } }, 1).values;
  rooms[0] = 'W9N9';
  expect(values.observerAssignedRooms).toEqual(['E0N1','W2N1']); expect(values.observerVisionBudget).toBe(2);
  expect(() => resolveConfig({ roomOverride: { observerCpuBudget: 10 } }, 1)).toThrow('shared observer');
  expect(() => resolveConfig({ temporary: { expiresAt: 10, values: { observerCaptureBudget: 2 } } }, 1)).toThrow('shared observer');
  expect(() => resolveConfig({ empire: { observerAssignedRooms: ['sim'] } }, 1)).toThrow('invalid');
  expect(() => resolveConfig({ empire: { observerAssignedRooms: ['W01N1'] } }, 1)).toThrow('invalid');
  expect(() => resolveConfig({ empire: { observerRequestLifetime: 1 } }, 1)).toThrow('invalid');
  expect(() => resolveConfig({ empire: { observerVisionBudget: 33 } }, 1)).toThrow('invalid');
  expect(() => resolveConfig({ empire: { observerCpuBudget: Infinity } }, 1)).toThrow('invalid');
});
