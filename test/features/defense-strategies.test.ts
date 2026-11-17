import { expect, test } from 'vitest';
import { createDefenseStrategies } from '../../src/features/planning/defense-strategies';
import { planningObservation } from '../fixtures/planning-observation';
test('all generators expose one lazy advance contract and detached policy inputs', () => {
  const observation = planningObservation();
  const input = { observation, protectedAssets: [{ type: 'storage', position: { x: 25, y: 25 } }],
    protectedTiles: [{ x: 25, y: 25 }], rcl: 6, costs: { rampart: 1, constructedWall: 1 } };
  const strategies = createDefenseStrategies(input, { terrain: observation.terrain,
    bounds: { minX: 20, maxX: 30, minY: 20, maxY: 30 }, rcl: 6 });
  expect(strategies.map(strategy => strategy.id)).toEqual(['terrain-cut-v1', 'exit-perimeter-v1', 'legacy-perimeter-v1']);
  const budget = { augmentations: 1, scans: 1 };
  for (const strategy of strategies) expect(strategy.advance(budget, () => false)).toEqual({ status: 'pending' });
  input.rcl = 2;
  for (const strategy of strategies.slice(1)) {
    const result = strategy.advance(budget, () => true);
    expect(result.status).toBe('complete');
    if (result.status === 'complete') expect(result.barriers.every(barrier => barrier.rcl === 6)).toBe(true);
  }
  expect(strategies[0]!.advance(budget, () => true).status).toBe('pending');
});
