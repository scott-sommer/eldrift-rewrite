import { expect, test } from 'vitest';
import { createDefenseCoordinator } from '../../src/features/planning/defense-coordinator';
import { planningObservation } from '../fixtures/planning-observation';
test('coordinator retains generator rejection, evaluates alternatives and selects a valid fallback', () => {
  const input = { observation: planningObservation(),
    placements: [{ type: 'storage', position: { x: 25, y: 25 } }],
    protectedAssets: [{ type: 'storage', position: { x: 25, y: 25 } }],
    costs: { rampart: 1, constructedWall: 1 }, origins: [{ x: 24, y: 25 }], gates: [], repairRange: 3,
    blocksMovement: (type: string) => type !== 'rampart',
    operations: { rampartDecayHits: 300, rampartDecayTicks: 100, repairEnergyPerHit: 0.01,
      minimumTowerPower: 0, tower: { power: 600, optimalRange: 5, falloffRange: 20, falloff: 0.75 } } };
  const coordinator = createDefenseCoordinator([
    { id: 'cut', advance: () => ({ status: 'rejected', reason: 'no-legal-cut' }) },
    { id: 'exposed', advance: () => ({ status: 'complete', barriers: [] }) },
    { id: 'fallback', advance: () => ({ status: 'complete', barriers: [
      { type: 'rampart', position: { x: 25, y: 25 }, rcl: 6 }] }) },
  ], input, { weights: { construction: 1, upkeep: 1, repairAccess: 1, gateAccess: 1, towerDeficit: 1 },
    maximumUnreachableRepair: 0, maximumBlockedGates: 0 });
  const budget = { augmentations: 1, scans: 10 };
  expect(coordinator.advance(budget, () => false)).toEqual({ status: 'pending' });
  let result = coordinator.advance(budget, () => true);
  for (let n = 0; result.status === 'pending' && n < 10; n++) result = coordinator.advance(budget, () => true);
  expect(result.status).toBe('complete');
  if (result.status !== 'complete') throw new Error('Expected selection');
  expect(result.selected?.id).toBe('fallback');
  expect(result.rejected).toEqual([{ id: 'cut', reason: 'no-legal-cut' }]);
  expect(result.completed.find(item => item.id === 'exposed')?.evaluation.ok).toBe(false);
  result.selected!.barriers[0]!.position.x = 0;
  const again = coordinator.advance(budget, () => true);
  if (again.status !== 'complete') throw new Error('Expected retained selection');
  expect(again.selected?.barriers[0]!.position.x).toBe(25);
});
