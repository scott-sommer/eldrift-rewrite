import { expect, test } from 'vitest';
import { legacy } from './legacy.mjs';
import { courier, roadScavenger, sourceMiner } from '../../src/capabilities/spawning/economy-recipes';
function context() {
  return legacy(['buildRoadScavengerBody', 'getBody'], {
    WORK: 'work', CARRY: 'carry', MOVE: 'move',
    Memory: { manager: { creeps: { miner: { W0N0: { units: { existing: {} } } }, courier: { W0N0: { units: { existing: {} } } }, distributor: {} } } },
  });
}
test('economy recipe ports match committed legacy output across budget thresholds', () => {
  const ctx = context();
  const recipes = { scavenger: roadScavenger, courier, miner: sourceMiner };
  for (const [role, recipe] of Object.entries(recipes)) {
    for (let budget = 300; budget <= 10000; budget += 25) {
      const room = { name: 'W0N0', energyAvailable: budget, energyCapacityAvailable: budget, controller: { level: 8 } };
      expect(recipe(budget)?.parts ?? [], role + ':' + budget).toEqual(Array.from(ctx.getBody(role, room, 0, budget)));
    }
  }
});
test('low-energy miner intentionally corrects legacy unaffordable fallback', () => {
  const ctx = context();
  const room = { name: 'W0N0', energyAvailable: 200, energyCapacityAvailable: 300, controller: { level: 1 } };
  expect(Array.from(ctx.getBody('miner', room, 0, 200))).toEqual(['work', 'work', 'carry', 'move']);
  expect(sourceMiner(200)?.parts).toEqual(['work', 'carry', 'move']);
  expect(sourceMiner(199)).toBeUndefined();
});
