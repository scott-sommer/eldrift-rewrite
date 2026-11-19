import { expect, test } from 'vitest';
import { forecastStartupSpawns } from '../../src/capabilities/economy/startup/spawns';
import type { StartupSpawnInput } from '../../src/capabilities/economy/startup/spawn-model';
import type { SpawnRequest } from '../../src/capabilities/spawning/request';
function request(id: string, overrides: Partial<SpawnRequest> = {}): SpawnRequest {
  return { id,name: id,owner: 'source',room: 'home',body: ['work','carry','move'],priority: 1,readyAt: 0,expiresAt: 101,...overrides };
}
function input(requests: SpawnRequest[], overrides: Partial<StartupSpawnInput> = {}): StartupSpawnInput {
  return { room: 'home',requests,spawns: [{ id: 'spawn',room: 'home',availableAt: 0 }],liveNames: new Set(),unaffordable: 'skip',
    funding: { capacity: 1000,initialEnergy: 1000,refills: [] },
    cash: { homeEnergy: 1000,protectedEnergy: 0,horizon: 100,readyAt: 0,selfHarvestedConstruction: 0,flows: [] },...overrides };
}
test('one spawn serializes births by actual body duration and charges each once',() => {
  const result = forecastStartupSpawns(input([request('b'),request('a')]));
  expect(result.births).toEqual([
    { request: 'a',spawn: 'spawn',startAt: 0,activeAt: 9,cost: 200 },
    { request: 'b',spawn: 'spawn',startAt: 9,activeAt: 18,cost: 200 },
  ]);
  expect(result.cash).toMatchObject({ birthEnergy: 400,endingEnergy: 600 });
  expect(result.unscheduled).toEqual([]);
});
test('parallel spawns honor occupied availability and share one protected bank',() => {
  const view = input([request('a'),request('b'),request('c')]);
  view.spawns = [{ id: 'b',room: 'home',availableAt: 4 },{ id: 'a',room: 'home',availableAt: 0 }];
  view.cash.homeEnergy = 650; view.funding.initialEnergy = 650; view.cash.protectedEnergy = 100;
  const result = forecastStartupSpawns(view);
  expect(result.births.map(birth => [birth.request,birth.spawn,birth.startAt])).toEqual([['a','a',0],['b','b',4]]);
  expect(result.unscheduled).toEqual([{ request: 'c',reason: 'horizon' }]);
  expect(result.cash.minimumEnergy).toBe(250);
});
test('same-frame projected receipts cannot fund an internal refill or earlier birth',() => {
  const view = input([request('miner')]); view.cash.homeEnergy = 0; view.funding.initialEnergy = 0;
  view.funding.refills = [{ id: 'distribution',energy: 200,firstTick: 6,interval: null,occurrences: 1 }];
  view.cash.flows = [{ id: 'credit',kind: 'delivery',energy: 200,firstTick: 5,interval: null,occurrences: 1 }];
  const result = forecastStartupSpawns(view);
  expect(result.births[0]).toMatchObject({ startAt: 7,activeAt: 16 });
  expect(result.cash).toMatchObject({ minimumEnergy: 0,endingEnergy: 0,homeShortfall: 0 });
});
test('external spending precedes births; self-harvested construction is never a home debit',() => {
  const view = input([request('miner')]); view.cash.homeEnergy = 500; view.funding.initialEnergy = 500; view.cash.protectedEnergy = 100;
  view.cash.selfHarvestedConstruction = 5000;
  view.cash.flows = [{ id: 'road',kind: 'home-construction',energy: 250,firstTick: 0,interval: null,occurrences: 1 }];
  const result = forecastStartupSpawns(view);
  expect(result.births).toEqual([]); expect(result.cash).toMatchObject({ endingEnergy: 250,birthEnergy: 0,homeConstructionEnergy: 250,constructionRecoveryMargin: -5250 });
});
test('existing allocator wait/skip policy is preserved for unaffordable priority requests',() => {
  const view = input([request('large',{ body: ['claim','move'],priority: 0 }),request('small',{ body: ['move'] })]);
  view.cash.homeEnergy = 100; view.funding.initialEnergy = 100;
  expect(forecastStartupSpawns(view).births.map(birth => birth.request)).toEqual(['small']);
  view.unaffordable = 'wait'; expect(forecastStartupSpawns(view).births).toEqual([]);
});
test('exclusive expiry, known live names, absent spawns and future readiness remain explicit',() => {
  const view = input([request('expired',{ readyAt: 0,expiresAt: 4 }),request('live'),request('future',{ readyAt: 101,expiresAt: 200 })]);
  view.liveNames = new Set(['live']); view.spawns = [];
  expect(forecastStartupSpawns(view).unscheduled).toEqual([
    { request: 'expired',reason: 'expired' },{ request: 'live',reason: 'live-name' },{ request: 'future',reason: 'horizon' },
  ]);
});
test('birth admitted on the inclusive final frame may become active beyond the horizon',() => {
  const view = input([request('miner',{ readyAt: 100 })]);
  expect(forecastStartupSpawns(view).births[0]).toMatchObject({ startAt: 100,activeAt: 109 });
});
test('external cash deficits are reported rather than silently funded by the scheduler',() => {
  const view = input([request('miner')]); view.cash.homeEnergy = 100; view.funding.initialEnergy = 100;
  view.cash.flows = [{ id: 'upkeep',kind: 'upkeep',energy: 150,firstTick: 0,interval: null,occurrences: 1 }];
  expect(forecastStartupSpawns(view).cash).toMatchObject({ endingEnergy: -50,homeShortfall: 50 });
  expect(forecastStartupSpawns(view).births).toEqual([]);
});
test('forecasts do not mutate requests, spawns or flow inputs',() => {
  const view = input([request('miner')]), before = JSON.stringify(view);
  forecastStartupSpawns(view); expect(JSON.stringify(view)).toBe(before);
});
test('invalid cross-room, duplicate and competing birth-flow assumptions are rejected',() => {
  expect(() => forecastStartupSpawns(input([request('a',{ room: 'elsewhere' })]))).toThrow();
  expect(() => forecastStartupSpawns(input([request('a'),request('a')]))).toThrow();
  const view = input([request('a')]);
  view.cash.flows = [{ id: 'external',kind: 'birth',energy: 200,firstTick: 0,interval: null,occurrences: 1 }];
  expect(() => forecastStartupSpawns(view)).toThrow();
  view.cash.flows = [{ ...view.cash.flows[0]!,id: 'birth:a',kind: 'delivery' }];
  expect(() => forecastStartupSpawns(view)).toThrow();
});
