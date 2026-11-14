import { expect, test } from 'vitest';
import { planUpgradeService, defaultUpgradeService } from '../../src/features/work/upgrade-service';
function fixture() {
  return { level: 6, storage: { id: 'storage', free: 1000000, stock: { energy: 0 } as Record<string, number> },
    terminal: { id: 'terminal', free: 300000, stock: { energy: 300, XGH2O: 1500, GH2O: 0, GH: 0 } as Record<string, number> },
    lab: { id: 'lab', mineral: 'GH' as string | undefined, amount: 100, mineralCapacity: 3000, energy: 0, energyCapacity: 2000 },
    spawn: { id: 'spawn', energy: 300, capacity: 300 } };
}
test('storage cleanup precedes lab service; stronger boost replaces weaker before filling', () => {
  const view = fixture();
  view.storage.stock['H'] = 20;
  expect(planUpgradeService(view)).toMatchObject({ direction: 'storage-mineral', resource: 'H', quantity: 20 });
  view.storage.stock['H'] = 0;
  expect(planUpgradeService(view)).toMatchObject({ direction: 'lab-mineral-clear', resource: 'GH', quantity: 100 });
  view.lab.mineral = undefined; view.lab.amount = 0;
  expect(planUpgradeService(view)).toMatchObject({ direction: 'lab-mineral-fill', resource: 'XGH2O', quantity: 200 });
});
test('strict stock thresholds, incompatible mineral and full terminal remain bounded', () => {
  const view = fixture();
  view.lab.mineral = undefined; view.lab.amount = 0; view.terminal.stock['XGH2O'] = 1300;
  expect(planUpgradeService(view)?.direction).toBe('lab-energy');
  view.lab.mineral = 'H'; view.lab.amount = 30;
  expect(planUpgradeService(view)).toMatchObject({ direction: 'lab-mineral-clear', resource: 'H', quantity: 30 });
  view.terminal.free = 0;
  expect(planUpgradeService(view)?.direction).toBe('lab-energy');
  view.lab.mineral = 'GH'; view.terminal.stock['GH'] = 1270;
  expect(planUpgradeService(view)?.direction).toBe('lab-energy');
  view.terminal.free = 300000;
  expect(planUpgradeService(view)?.direction).toBe('lab-mineral-clear');
});
test('energy service prioritizes low spawn, lab, then bounded storage; low-level rooms can use storage', () => {
  const view = fixture(); view.lab.amount = 1300;
  expect(planUpgradeService(view, { ...defaultUpgradeService, spawnFloor: 300 })?.direction).toBe('lab-energy');
  view.spawn.energy = 100;
  expect(planUpgradeService(view)).toMatchObject({ direction: 'spawn-energy', quantity: 200 });
  view.spawn.energy = 101;
  expect(planUpgradeService(view)?.direction).toBe('lab-energy');
  view.lab.energy = 2000; view.storage.stock['energy'] = 989990;
  expect(planUpgradeService(view)).toMatchObject({ direction: 'storage-energy', quantity: 10 });
  view.storage.stock['energy'] = 990000;
  expect(planUpgradeService(view)).toBeUndefined();
  view.level = 5; view.terminal.stock['energy'] = 0; view.spawn.energy = 0;
  expect(planUpgradeService(view)).toMatchObject({ source: 'storage', sink: 'spawn', quantity: 200 });
  expect(() => planUpgradeService(view, { ...defaultUpgradeService, maximumBatch: 0 })).toThrow();
});
