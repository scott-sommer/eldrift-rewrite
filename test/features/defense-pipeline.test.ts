import { expect, test } from 'vitest';
import { createDefenseStrategies } from '../../src/features/planning/defense-strategies';
import { createStoredDefenseStrategies } from '../../src/features/planning/stored-defense-strategies';
import { createDefenseSearchStore } from '../../src/features/planning/defense-search-store';
import type { Envelope } from '../../src/persistence/versioned-state';
import { createDefenseCoordinator } from '../../src/features/planning/defense-coordinator';
import { planningObservation } from '../fixtures/planning-observation';
test.each([false, true])('real strategies converge through evaluation with durable search=%s', durable => {
  const observation = planningObservation();
  observation.terrain = Array.from({ length: 2500 }, (_, index) =>
    Math.floor(index / 50) === 25 && index % 50 <= 30 ? 'plain' : 'wall');
  observation.objects = [];
  const storage = { type: 'storage', position: { x: 25, y: 25 } };
  const generation = { observation, protectedAssets: [storage], protectedTiles: [storage.position],
    rcl: 6, costs: { rampart: 1, constructedWall: 1 } };
  const fallback = { terrain: observation.terrain, rcl: 6,
    bounds: { minX: 22, maxX: 28, minY: 22, maxY: 28 } };
  const records: Record<string, Envelope> = {};
  const store = createDefenseSearchStore({ read: key => records[key], write: (key, value) => { records[key] = value; } }, 'W0N1');
  const strategies = durable ? createStoredDefenseStrategies(store, generation, fallback)
    : createDefenseStrategies(generation, fallback);
  const coordinator = createDefenseCoordinator(strategies, { observation, protectedAssets: [storage],
    placements: [storage], costs: generation.costs, origins: [{ x: 24, y: 25 }], gates: [], repairRange: 3,
    blocksMovement: type => type !== 'rampart',
    operations: { rampartDecayHits: 300, rampartDecayTicks: 100, repairEnergyPerHit: 0.01,
      minimumTowerPower: 0, tower: { power: 600, optimalRange: 5, falloffRange: 20, falloff: 0.75 } } },
  { weights: { construction: 1, upkeep: 1, repairAccess: 0, gateAccess: 0, towerDeficit: 0 },
    maximumUnreachableRepair: 2500, maximumBlockedGates: 0 });
  const budget = { augmentations: 1, scans: 5 };
  let result = coordinator.advance(budget, () => true);
  for (let calls = 0; result.status === 'pending' && calls < 2000; calls++) {
    result = coordinator.advance(budget, () => true);
  }
  expect(result.status).toBe('complete');
  if (result.status !== 'complete') throw new Error('Expected pipeline completion');
  expect(result.completed).toHaveLength(3);
  expect(result.completed.every(item => item.evaluation.ok)).toBe(true);
  expect(result.selected?.barriers).toHaveLength(1);
  expect(result.selection.ranked).toHaveLength(3);
  expect(result.rejected).toEqual([]);
});



test('real fallback survives rejected terrain interior and obstructed exit perimeter', () => {
  const observation = planningObservation();
  observation.terrain = Array.from({ length: 2500 }, (_, index) =>
    Math.floor(index / 50) === 25 && index % 50 <= 30 ? 'plain' : 'wall');
  observation.objects = [];
  observation.constraints = [{ id: 'exit-access', kind: 'keep-clear', position: { x: 2, y: 25 } }];
  const storage = { type: 'storage', position: { x: 25, y: 25 } };
  const generation = { observation, protectedAssets: [storage], protectedTiles: [storage.position, { x: 0, y: 25 }],
    rcl: 6, costs: { rampart: 1, constructedWall: 1 } };
  const coordinator = createDefenseCoordinator(createDefenseStrategies(generation, {
    terrain: observation.terrain, rcl: 6, bounds: { minX: 22, maxX: 28, minY: 22, maxY: 28 } }),
  { observation, protectedAssets: [storage], placements: [storage], costs: generation.costs,
    origins: [{ x: 24, y: 25 }], gates: [], repairRange: 3, blocksMovement: type => type !== 'rampart',
    operations: { rampartDecayHits: 300, rampartDecayTicks: 100, repairEnergyPerHit: 0.01,
      minimumTowerPower: 0, tower: { power: 600, optimalRange: 5, falloffRange: 20, falloff: 0.75 } } },
  { weights: { construction: 1, upkeep: 1, repairAccess: 0, gateAccess: 0, towerDeficit: 0 },
    maximumUnreachableRepair: 2500, maximumBlockedGates: 0 });
  const budget = { augmentations: 10, scans: 100000 };
  let result = coordinator.advance(budget, () => true);
  for (let calls = 0; result.status === 'pending' && calls < 50; calls++) result = coordinator.advance(budget, () => true);
  if (result.status !== 'complete') throw new Error('Expected fallback selection');
  expect(result.selected?.id).toBe('legacy-perimeter-v1');
  expect(result.selected?.evaluation.ok).toBe(true);
  expect(result.rejected.map(item => item.id)).toEqual(['terrain-cut-v1', 'exit-perimeter-v1']);
});
