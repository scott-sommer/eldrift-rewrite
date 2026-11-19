import { expect, test } from 'vitest';
import { energyHarvestEffect } from '../../src/capabilities/mining/harvest-effect';
import { forecastSelfBuild } from '../../src/capabilities/economy/startup/self-build';
test('full native WORK output removes source stock before clipping cargo and dropping overflow',() => {
  expect(energyHarvestEffect(8,100,48,50)).toEqual({ harvestedEnergy: 8,carriedEnergy: 50,overflowEnergy: 6 });
  expect(energyHarvestEffect(8,3,48,50)).toEqual({ harvestedEnergy: 3,carriedEnergy: 50,overflowEnergy: 1 });
  expect(energyHarvestEffect(8,100,0,0)).toEqual({ harvestedEnergy: 8,carriedEnergy: 0,overflowEnergy: 8 });
});
test('construction reports unrecovered harvest overflow instead of inventing source retention',() => {
  const result = forecastSelfBuild({ remainingProgress: 50,carriedEnergy: 0,carryCapacity: 50,harvestPower: 60,buildPower: 100,maximumTicks: 2,
    source: { energy: 100,capacity: 100,regenerationTicks: 300,regenerationIn: null } });
  expect(result).toMatchObject({ status: 'complete',harvestedEnergy: 60,constructionEnergy: 50,overflowEnergy: 10,sourceEnergy: 40,carriedEnergy: 0 });
  expect(result.harvestedEnergy).toBe(result.constructionEnergy+result.carriedEnergy+result.overflowEnergy);
});
test('invalid or overfilled input stock is rejected',() => {
  expect(() => energyHarvestEffect(8,100,51,50)).toThrow();
  expect(() => energyHarvestEffect(Infinity,100,0,50)).toThrow();
});
