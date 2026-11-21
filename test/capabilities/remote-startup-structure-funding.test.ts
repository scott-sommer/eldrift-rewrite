import { expect, test } from 'vitest';
import { createStartupSpawnTimeline } from '../../src/capabilities/economy/startup/spawn-timeline';
import { startupEnergyLayout } from '../fixtures/startup-energy';
import type { StartupSpawnInput } from '../../src/capabilities/economy/startup/spawn-model';
function input(): StartupSpawnInput {
  return { room: 'home',requests: [{ id: 'worker',name: 'worker',owner: 'remote',room: 'home',priority: 2,readyAt: 0,expiresAt: 1,body: ['work','carry','move'] }],
    spawns: [{ id: 'spawn',room: 'home',availableAt: 0 }],liveNames: new Set(),unaffordable: 'skip',
    cash: { homeEnergy: 1000,protectedEnergy: 0,horizon: 2,readyAt: 0,selfHarvestedConstruction: 0,flows: [] },
    funding: { capacity: 700,initialEnergy: 500,refills: [],energyLayout: startupEnergyLayout() } };
}
test('skip policy preserves the slot and money after a physical reservation refusal; wait blocks',() => {
  const view = input(); view.funding.energyLayout!.structures[0]!.reservedEnergy = 100;
  view.funding.initialEnergy = 400; view.funding.capacity = 600;
  view.requests = [{ ...view.requests[0]!,id: 'expensive',name: 'expensive',priority: 1,body: ['work','work','move'] },...view.requests];
  const skip = createStartupSpawnTimeline(view);
  expect(skip.begin(0).map(birth => birth.request)).toEqual(['worker']); skip.finish();
  expect(skip.checkpoint().funding).toMatchObject({ bank: 800,accessible: 200 });
  view.unaffordable = 'wait'; const wait = createStartupSpawnTimeline(view); expect(wait.begin(0)).toEqual([]); wait.finish();
  expect(wait.checkpoint().funding.bank).toBe(1000);
});
test('two slots cannot debit the same physical stock twice',() => {
  const view = input(); view.spawns = [...view.spawns,{ id: 'second',room: 'home',availableAt: 0 }];
  view.requests = [view.requests[0]!,{ ...view.requests[0]!,id: 'second-worker',name: 'second-worker' }];
  const timeline = createStartupSpawnTimeline(view); expect(timeline.begin(0)).toHaveLength(2); timeline.finish();
  expect(timeline.checkpoint().energy!.points.reduce((sum,point) => sum+point.energy,0)).toBe(100);
  expect(timeline.checkpoint().funding.accessible).toBe(100);
});
test('unlocated external costs withhold budget without inventing physical destination capacity',() => {
  const view = input(); view.requests = [];
  view.cash.flows = [{ id: 'work',kind: 'upkeep',energy: 100,firstTick: 0,interval: null,occurrences: 1 }];
  const timeline = createStartupSpawnTimeline(view); timeline.begin(0);
  expect(timeline.transferHousehold(100,'spawn','cargo')).toBe(0); timeline.finish();
  expect(timeline.checkpoint().funding.accessible).toBe(400);
  expect(timeline.checkpoint().energy!.points[0]!.energy).toBe(300);
  expect(createStartupSpawnTimeline(view,JSON.parse(JSON.stringify(timeline.checkpoint()))).checkpoint()).toEqual(timeline.checkpoint());
});
test('addressed transfers after a paid birth round-trip without replaying the birth or inventing money',() => {
  const view = input(), timeline = createStartupSpawnTimeline(view); expect(timeline.begin(0)).toHaveLength(1);
  expect(timeline.transferHousehold(400,'spawn','cargo')).toBe(200); timeline.finish();
  const saved = JSON.parse(JSON.stringify(timeline.checkpoint()));
  const resumed = createStartupSpawnTimeline(view,saved); expect(resumed.begin(1)).toEqual([]); resumed.finish(); resumed.begin(2); resumed.finish();
  expect(resumed.result()).toMatchObject({ births: [{ request: 'worker',cost: 200 }],funding: { endingSpawnEnergy: 500,refilledEnergy: 200 },cash: { endingEnergy: 800,birthEnergy: 200,deliveredEnergy: 0 } });
  saved.energy.events[0].holder = 'invented'; expect(() => createStartupSpawnTimeline(view,saved)).toThrow('checkpoint');
});
test('physical inputs require consistent totals, addressed transfers and no implicit refill schedule',() => {
  const view = input(); view.funding.initialEnergy--; expect(() => createStartupSpawnTimeline(view)).toThrow('totals');
  view.funding.initialEnergy++; view.funding.refills = [{ id: 'implicit',energy: 100,firstTick: 0,interval: null,occurrences: 1 }];
  expect(() => createStartupSpawnTimeline(view)).toThrow('refills'); view.funding.refills = [];
  const timeline = createStartupSpawnTimeline(view); timeline.begin(0); expect(() => timeline.transferHousehold(100)).toThrow('destination');
});
