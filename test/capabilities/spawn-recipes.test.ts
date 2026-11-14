import { expect, test } from 'vitest';
import { bodyPlan } from '../../src/capabilities/spawning/body';
import { courier, roadScavenger, sourceMiner } from '../../src/capabilities/spawning/economy-recipes';
test('ported scavenger preserves road triads, remainder pair and 1600 cap', () => {
  expect(roadScavenger(99)).toBeUndefined();
  expect(roadScavenger(100)?.parts).toEqual(['carry', 'move']);
  expect(roadScavenger(250)?.parts).toEqual(['carry', 'carry', 'move', 'carry', 'move']);
  expect(roadScavenger(10000)).toMatchObject({ cost: 1600, spawnTicks: 96 });
});
test('courier preserves grouped ordering and work-equipped mature body', () => {
  expect(courier(300)?.parts).toEqual(['carry', 'carry', 'carry', 'move', 'move', 'move']);
  const mature = courier(1100)!;
  expect(mature.parts.slice(0, 12)).toEqual(Array(12).fill('carry'));
  expect(mature.parts[12]).toBe('work');
  expect(mature.cost).toBe(1050);
  expect(courier(10000)?.parts).toHaveLength(50);
});
test('miner tiers preserve legacy bodies with an affordable 200-energy recovery fallback', () => {
  expect([199, 200, 300, 549, 550, 799, 800, 899, 900].map(budget => sourceMiner(budget)?.cost))
    .toEqual([undefined, 200, 300, 300, 550, 550, 800, 800, 900]);
});
test('all economy recipes obey budgets, part limits and return detached bodies', () => {
  for (const recipe of [roadScavenger, courier, sourceMiner]) {
    for (let budget = 0; budget <= 10000; budget += 25) {
      const plan = recipe(budget);
      if (!plan) continue;
      expect(plan.cost).toBeLessThanOrEqual(budget);
      expect(plan.parts.length).toBeLessThanOrEqual(50);
      expect(plan.spawnTicks).toBe(plan.parts.length * 3);
    }
    const first = recipe(900)!;
    first.parts.pop();
    expect(recipe(900)!.parts.length).toBe(first.parts.length + 1);
    expect(() => recipe(-1)).toThrow();
  }
  expect(() => bodyPlan(Array(51).fill('move'), 10000)).toThrow('part limit');
});
