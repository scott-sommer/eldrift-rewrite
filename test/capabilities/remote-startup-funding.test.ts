import { expect, test } from 'vitest';
import { forecastStartupSpawns } from '../../src/capabilities/economy/startup/spawns';
import type { StartupSpawnInput } from '../../src/capabilities/economy/startup/spawn-model';
function input(): StartupSpawnInput {
  return { room: 'home',requests: [{ id: 'miner',name: 'miner',owner: 'remote',room: 'home',priority: 1,readyAt: 0,expiresAt: 100,body: ['work','carry','move'] }],
    spawns: [{ id: 's',room: 'home',availableAt: 0 }],liveNames: new Set(),unaffordable: 'skip',
    cash: { homeEnergy: 10000,protectedEnergy: 0,horizon: 20,readyAt: 0,selfHarvestedConstruction: 0,flows: [] },
    funding: { capacity: 300,initialEnergy: 0,refills: [] } };
}
test('large home storage cannot directly finance a native-shaped spawn request',() => {
  const result = forecastStartupSpawns(input());
  expect(result.births).toEqual([]); expect(result.cash.endingEnergy).toBe(10000);
  expect(result.funding).toEqual({ endingSpawnEnergy: 0,refilledEnergy: 0,unfilledEnergy: 0 });
});
test('explicit distribution refills settle after admission and are neither income nor expense',() => {
  const view = input(); view.funding.refills = [{ id: 'distributor',energy: 200,firstTick: 4,interval: null,occurrences: 1 }];
  const result = forecastStartupSpawns(view);
  expect(result.births[0]).toMatchObject({ startAt: 5,cost: 200 });
  expect(result.cash).toMatchObject({ endingEnergy: 9800,deliveredEnergy: 0,birthEnergy: 200 });
  expect(result.funding).toMatchObject({ refilledEnergy: 200,endingSpawnEnergy: 0 });
});
test('refills cannot exceed room capacity or fund bodies larger than it',() => {
  const view = input(); view.funding.capacity = 150;
  view.funding.refills = [{ id: 'distribution',energy: 200,firstTick: 0,interval: 1,occurrences: 2 }];
  const result = forecastStartupSpawns(view);
  expect(result.births).toEqual([]);
  expect(result.funding).toEqual({ endingSpawnEnergy: 150,refilledEnergy: 150,unfilledEnergy: 250 });
});
test('two spawns cannot spend the same room pool; another explicit refill is required',() => {
  const view = input(); view.funding.initialEnergy = 200;
  view.spawns = [{ id: 'a',room: 'home',availableAt: 0 },{ id: 'b',room: 'home',availableAt: 0 }];
  view.requests = [...view.requests,{ ...view.requests[0]!,id: 'second',name: 'second' }];
  view.funding.refills = [{ id: 'distribution',energy: 200,firstTick: 2,interval: null,occurrences: 1 }];
  const result = forecastStartupSpawns(view);
  expect(result.births.map(birth => [birth.spawn,birth.startAt])).toEqual([['a',0],['b',3]]);
  expect(result.cash.endingEnergy).toBe(9600);
});
test('refills are limited by physical non-spawn bank stock and preserve protected capital',() => {
  const view = input(); view.cash.homeEnergy = 250; view.cash.protectedEnergy = 100;
  view.funding.refills = [{ id: 'distribution',energy: 500,firstTick: 0,interval: null,occurrences: 1 }];
  const result = forecastStartupSpawns(view);
  expect(result.births).toEqual([]); expect(result.cash.endingEnergy).toBe(250);
  expect(result.funding).toEqual({ endingSpawnEnergy: 250,refilledEnergy: 250,unfilledEnergy: 250 });
});
test('same-frame income does not retroactively fulfill an earlier distribution intent',() => {
  const view = input(); view.cash.homeEnergy = 0;
  view.cash.flows = [{ id: 'remote-credit',kind: 'delivery',energy: 200,firstTick: 4,interval: null,occurrences: 1 }];
  view.funding.refills = [{ id: 'distribution',energy: 200,firstTick: 4,interval: 1,occurrences: 2 }];
  const result = forecastStartupSpawns(view);
  expect(result.births[0]?.startAt).toBe(6);
  expect(result.funding).toMatchObject({ refilledEnergy: 200,unfilledEnergy: 200 });
  expect(result.cash).toMatchObject({ endingEnergy: 0,deliveredEnergy: 200,birthEnergy: 200 });
});
test('external expenses conservatively consume accessible stock before a forecast birth',() => {
  const view = input(); view.funding.initialEnergy = 200;
  view.cash.flows = [{ id: 'local-work',kind: 'upkeep',energy: 50,firstTick: 0,interval: null,occurrences: 1 }];
  const result = forecastStartupSpawns(view);
  expect(result.births).toEqual([]); expect(result.funding.endingSpawnEnergy).toBe(150);
  expect(result.cash.endingEnergy).toBe(9950);
});
test('invalid pool balances and non-finite refill schedules fail closed',() => {
  const view = input(); view.funding.initialEnergy = 301;
  expect(() => forecastStartupSpawns(view)).toThrow();
  view.funding.initialEnergy = 200; view.cash.homeEnergy = 100;
  expect(() => forecastStartupSpawns(view)).toThrow();
  view.funding.initialEnergy = 0;
  view.funding.refills = [{ id: 'bad',energy: 200,firstTick: 0,interval: 0,occurrences: 2 }];
  expect(() => forecastStartupSpawns(view)).toThrow();
});
