import { expect,test } from 'vitest';
import { energyBuildEffect } from '../../src/capabilities/construction/build-effect';

test('construction charges base energy even when boosted progress reaches completion',() => {
  expect(energyBuildEffect({ workParts: 1,boostBonuses: [10] },98,100,20)).toEqual({ energySpent: 2,progressAdded: 2 });
  expect(energyBuildEffect({ workParts: 1,boostBonuses: [10] },0,100,1)).toEqual({ energySpent: 1,progressAdded: 11 });
});
test('construction rejects malformed quantities and WORK profiles',() => {
  const profile = { workParts: 1,boostBonuses: [] };
  expect(() => energyBuildEffect(profile,101,100,1)).toThrow();
  expect(() => energyBuildEffect(profile,0,100,-1)).toThrow();
  expect(() => energyBuildEffect({ ...profile,workParts: 51 },0,100,1)).toThrow();
  expect(() => energyBuildEffect({ ...profile,boostBonuses: [NaN] },0,100,1)).toThrow();
});
