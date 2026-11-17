import { expect, test, vi } from 'vitest';
import { awaitsUpgradeMasterHandoff } from '../../src/features/work/upgrade-master-handoff';
import type { MasterHandoffSupplier } from '../../src/features/work/upgrade-master-handoff';
import { upgradeSupplyOwner } from '../../src/features/work/upgrade-supply';
const view = { level: 2, cargo: 0, position: { room: 'E0N1', x: 2, y: 21 } };
function supplier(): MasterHandoffSupplier {
  return { owned: true, spawning: false, recovering: false, energy: 900,
    position: { room: 'E0N1', x: 3, y: 21 }, population: { home: 'W0N1', owner: upgradeSupplyOwner('W0N1','E0N1') } };
}
test('empty low-RCL master yields only to an adjacent loaded matching supply route', () => {
  expect(awaitsUpgradeMasterHandoff(view, () => [supplier()])).toBe(true);
  expect(awaitsUpgradeMasterHandoff({ ...view, level: 5 }, () => [supplier()])).toBe(true);
  for (const patch of [
    { energy: 0 }, { owned: false }, { spawning: true }, { recovering: true }, { population: undefined },
    { position: { room: 'E0N1', x: 4, y: 21 } }, { position: { room: 'W0N1', x: 3, y: 21 } },
    { population: { home: 'W0N1', owner: upgradeSupplyOwner('W0N1', 'E1N1') } },
    { population: { home: 'E1N1', owner: upgradeSupplyOwner('W0N1', 'E0N1') } },
    { population: { home: 'W0N1', owner: 'hauling:W0N1' } },
  ]) expect(awaitsUpgradeMasterHandoff(view, () => [{ ...supplier(), ...patch }])).toBe(false);
});
test('loaded and mature masters do not observe supply or stall service and settlement', () => {
  const observe = vi.fn(() => [supplier()]);
  expect(awaitsUpgradeMasterHandoff({ ...view, cargo: 1 }, observe)).toBe(false);
  expect(awaitsUpgradeMasterHandoff({ ...view, level: 6 }, observe)).toBe(false);
  expect(observe).not.toHaveBeenCalled();
});
