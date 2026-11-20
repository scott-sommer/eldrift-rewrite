import { expect, test } from 'vitest';
import { forecastStartupConstruction } from '../../src/capabilities/economy/startup/construction';
import type { StartupConstructionInput } from '../../src/capabilities/economy/startup/construction-model';
function input(): StartupConstructionInput {
  return { remainingProgress: 20,source: { energy: 10,capacity: 10,regenerationTicks: 30,regenerationIn: null },
    workers: [{ request: 'first',travelTicks: 0,retireTicks: 1489 },{ request: 'second',travelTicks: 0,retireTicks: 1489 }],
    spawning: { room: 'home',requests: ['first','second'].map((id,index) => ({ id,name: id,owner: 'source',room: 'home',body: ['work','carry','move'],priority: 1,readyAt: index*30,expiresAt: 100 })),
      spawns: [{ id: 'spawn',room: 'home',availableAt: 0 }],liveNames: new Set(),unaffordable: 'skip',
      funding: { capacity: 400,initialEnergy: 400,refills: [] },
      cash: { homeEnergy: 400,protectedEnergy: 0,horizon: 60,readyAt: 0,selfHarvestedConstruction: 20,flows: [] } } };
}
test('explicit funded replacement waves finish work across an idle source regeneration gap',() => {
  const result = forecastStartupConstruction(input());
  expect(result.spawning.births.map(birth => birth.startAt)).toEqual([0,30]);
  expect(result.construction).toMatchObject({ status: 'complete',completeAt: 49,remainingProgress: 0,harvestedEnergy: 20,constructionEnergy: 20,regeneratedEnergy: 10,unusedCargoEnergy: 0,source: { energy: 0,regenerationIn: 20 } });
  expect(result.construction.waves.map(wave => [wave.startAt,wave.endAt])).toEqual([[9,19],[39,49]]);
});
test('unfunded replacements provide no free labor even when home bank still has inaccessible cash',() => {
  const view = input(); view.spawning.funding.initialEnergy = 200;
  const result = forecastStartupConstruction(view);
  expect(result.spawning.unscheduled).toEqual([{ request: 'second',reason: 'horizon' }]);
  expect(result.construction).toMatchObject({ status: 'incomplete',completeAt: null,remainingProgress: 10,constructionEnergy: 10 });
});
test('a supplied distribution schedule enables the replacement without creating income',() => {
  const view = input(); view.spawning.funding.initialEnergy = 200;
  view.spawning.funding.refills = [{ id: 'local-distribution',energy: 200,firstTick: 29,interval: null,occurrences: 1 }];
  const result = forecastStartupConstruction(view);
  expect(result.construction.completeAt).toBe(49);
  expect(result.spawning.cash).toMatchObject({ deliveredEnergy: 0,birthEnergy: 400,endingEnergy: 0 });
});
test('outbound travel consumes the same finite lifetime as construction and delays regeneration phase',() => {
  const view = input(); view.workers = [{ request: 'first',travelTicks: 5,retireTicks: 1489 }];
  const result = forecastStartupConstruction(view).construction;
  expect(result.waves[0]).toMatchObject({ startAt: 14,endAt: 19,work: { ticks: 5,constructionEnergy: 4 } });
  expect(result.remainingProgress).toBe(16);
});
test('unused outgoing cargo is accounted but is never inherited by the next newborn worker',() => {
  const view = input(); view.remainingProgress = 10; view.source = { energy: 100,capacity: 100,regenerationTicks: 300,regenerationIn: null };
  view.workers = [{ request: 'first',travelTicks: 0,retireTicks: 1490 },{ request: 'second',travelTicks: 0,retireTicks: 1497 }];
  const result = forecastStartupConstruction(view).construction;
  expect(result).toMatchObject({ completeAt: 41,harvestedEnergy: 12,constructionEnergy: 10,unusedCargoEnergy: 2 });
  expect(result.harvestedEnergy).toBe(result.constructionEnergy+result.unusedCargoEnergy);
  expect(100+result.regeneratedEnergy-result.harvestedEnergy).toBe(result.source.energy);
});
test('horizon clipping and a worker with no remaining station service cannot complete work',() => {
  const view = input(); view.spawning.cash.horizon = 10;
  const result = forecastStartupConstruction(view).construction;
  expect(result.waves[0]?.work.ticks).toBe(2); expect(result.remainingProgress).toBe(18);
  view.workers = [{ request: 'first',travelTicks: 10,retireTicks: 1489 }];
  expect(forecastStartupConstruction(view).construction.waves).toEqual([]);
});
test('overlapping builders and unsupported worker bodies are explicitly refused',() => {
  const view = input(); view.workers = view.workers.map(worker => ({ ...worker,retireTicks: 0 }));
  expect(() => forecastStartupConstruction(view)).toThrow('handoff');
  view.spawning.requests = [{ ...view.spawning.requests[0]!,body: ['claim','carry','move'] }];
  view.workers = [{ request: 'first',travelTicks: 0,retireTicks: 0 }];
  expect(() => forecastStartupConstruction(view)).toThrow('Unsupported');
});
test('already completed work, empty labor and invalid source observations retain explicit outcomes',() => {
  const view = input(), before = JSON.stringify(view); forecastStartupConstruction(view); expect(JSON.stringify(view)).toBe(before);
  view.workers = []; expect(forecastStartupConstruction(view).construction).toMatchObject({ status: 'incomplete',remainingProgress: 20,waves: [] });
  view.remainingProgress = 0; expect(forecastStartupConstruction(view).construction).toMatchObject({ status: 'complete',completeAt: 0,waves: [] });
  view.source.energy = 11; expect(() => forecastStartupConstruction(view)).toThrow();
});
