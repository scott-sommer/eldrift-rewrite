import { expect, test } from 'vitest';
import { forecastSelfBuild } from '../../src/capabilities/economy/startup/self-build';
import type { SelfBuildInput } from '../../src/capabilities/economy/startup/build-model';
function input(overrides: Partial<SelfBuildInput> = {}): SelfBuildInput {
  return { remainingProgress: 5000,carriedEnergy: 0,carryCapacity: 50,harvestPower: 8,buildPower: 20,maximumTicks: 1500,
    source: { energy: 1500,capacity: 1500,regenerationTicks: 300,regenerationIn: null },...overrides };
}
test('actual mining policy alternates one harvest and build rather than inventing full-CARRY batching',() => {
  const result = forecastSelfBuild(input());
  expect(result).toMatchObject({ status: 'complete',ticks: 1250,constructionEnergy: 5000,harvestedEnergy: 5000,harvestTicks: 625,buildTicks: 625,idleTicks: 0,remainingProgress: 0,carriedEnergy: 0,sourceEnergy: 1300 });
  expect(1500+result.regeneratedEnergy).toBe(result.sourceEnergy+result.harvestedEnergy);
});
test('a finite service interval returns incomplete progress instead of assuming replacement labor',() => {
  expect(forecastSelfBuild(input({ maximumTicks: 1000 }))).toMatchObject({ status: 'incomplete',ticks: 1000,constructionEnergy: 4000,remainingProgress: 1000 });
});
test('partially completed work and carried energy are already funded; final build is clipped',() => {
  const original = input({ remainingProgress: 13,carriedEnergy: 20 }), before = structuredClone(original);
  expect(forecastSelfBuild(original)).toMatchObject({ status: 'complete',ticks: 1,constructionEnergy: 13,harvestedEnergy: 0,carriedEnergy: 7,harvestTicks: 0,buildTicks: 1 });
  expect(original).toEqual(before);
});
test('initially depleted source waits for its actual phase and never fabricates harvest stock',() => {
  const result = forecastSelfBuild(input({ remainingProgress: 8,source: { energy: 0,capacity: 1500,regenerationTicks: 300,regenerationIn: 3 } }));
  expect(result).toMatchObject({ status: 'complete',ticks: 5,idleTicks: 3,harvestTicks: 1,buildTicks: 1,constructionEnergy: 8,regeneratedEnergy: 1500,sourceEnergy: 1492 });
});
test('zero power is a stalled bounded projection, not productive work',() => {
  expect(forecastSelfBuild(input({ harvestPower: 0,buildPower: 0,maximumTicks: 20 }))).toMatchObject({ status: 'incomplete',ticks: 20,idleTicks: 20,constructionEnergy: 0,harvestedEnergy: 0 });
});
test('already completed work needs no actions and a zero budget changes nothing',() => {
  expect(forecastSelfBuild(input({ remainingProgress: 0 }))).toMatchObject({ status: 'complete',ticks: 0,sourceEnergy: 1500 });
  expect(forecastSelfBuild(input({ maximumTicks: 0 }))).toMatchObject({ status: 'incomplete',ticks: 0,remainingProgress: 5000 });
});
test.each([{ maximumTicks: 1501 },{ carryCapacity: 0 },{ carriedEnergy: 51 },{ remainingProgress: -1 },{ buildPower: NaN },{ source: { energy: 1501,capacity: 1500,regenerationTicks: 300,regenerationIn: null } }])('invalid build inputs fail before projection',(overrides) => {
  expect(() => forecastSelfBuild(input(overrides))).toThrow();
});

test('a due regeneration clock stays representable even when full stock postpones native timer processing',() => {
  const result = forecastSelfBuild(input({ maximumTicks: 20,harvestPower: 0,source: { energy: 1500,capacity: 1500,regenerationTicks: 300,regenerationIn: 1 } }));
  expect(result.regenerationIn).toBe(0); expect(result.sourceEnergy).toBe(1500);
  expect(forecastSelfBuild(input({ remainingProgress: 8,source: { energy: 0,capacity: 1500,regenerationTicks: 300,regenerationIn: 0 } }))).toMatchObject({ status: 'complete',ticks: 3,idleTicks: 1 });
});
