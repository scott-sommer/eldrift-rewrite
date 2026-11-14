import { expect, test } from 'vitest';
import { planStoreBalance } from '../../src/features/logistics/store-balance';
import { resolveConfig } from '../../src/config/resolve';
const policy = { terminalLow: 20000, terminalHigh: 30000, storageEnergyReserve: 70000, maximumBatch: 200 };
const storage = { id: 'storage', free: 1000, stock: { energy: 80000 } };
const terminal = (energy: number) => ({ id: 'terminal', free: 1000, stock: { energy } });
test('fill and drain stop at separate boundaries without crossing storage reserve', () => {
  expect(planStoreBalance(storage, terminal(19950), policy)).toMatchObject({ direction: 'fill', quantity: 50 });
  expect(planStoreBalance({ ...storage, stock: { energy: 70020 } }, terminal(0), policy)?.quantity).toBe(20);
  expect(planStoreBalance({ ...storage, stock: { energy: 70000 } }, terminal(0), policy)).toBeUndefined();
  for (const energy of [20000, 25000, 30000]) expect(planStoreBalance(storage, terminal(energy), policy)).toBeUndefined();
  expect(planStoreBalance(storage, terminal(30050), policy)).toMatchObject({ direction: 'drain', quantity: 50 });
});
test('stored minerals move to terminal within headroom and drain can proceed when terminal is full', () => {
  const minerals = { ...storage, stock: { energy: 80000, H: 300 } };
  expect(planStoreBalance(minerals, { ...terminal(25000), free: 30 }, policy)).toMatchObject({ direction: 'mineral', resource: 'H', quantity: 30 });
  expect(planStoreBalance(minerals, { ...terminal(31000), free: 0 }, policy)).toMatchObject({ direction: 'drain', quantity: 200 });
  expect(planStoreBalance({ ...storage, free: 0 }, terminal(31000), policy)).toBeUndefined();
});
test('missing endpoints and overlapping thresholds cannot create balancing work', () => {
  expect(planStoreBalance(undefined, terminal(0), policy)).toBeUndefined();
  expect(planStoreBalance(storage, undefined, policy)).toBeUndefined();
  expect(() => planStoreBalance(storage, terminal(0), { ...policy, terminalHigh: 20000 })).toThrow();
  expect(() => resolveConfig({ empire: { terminalEnergyLow: 40000 } }, 1)).toThrow('terminalEnergyLow');
});
