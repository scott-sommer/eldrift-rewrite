import { expect, test } from 'vitest';
import { forecastStartupDelivery } from '../../src/capabilities/economy/startup/delivery';
import type { StartupDeliveryInput } from '../../src/capabilities/economy/startup/delivery-model';
function input(): StartupDeliveryInput {
  return { containerCapacity: 2000,couriers: [{ request: 'courier',outboundTicks: 1,returnTicks: 2,retireTicks: 10,minimumBatch: 4 }],
    project: { remainingProgress: 4,source: { energy: 100,capacity: 100,regenerationTicks: 300,regenerationIn: null },
      workers: [{ request: 'miner',travelTicks: 0,retireTicks: 10 }],
      spawning: { room: 'home',requests: [
        { id: 'miner',name: 'miner',owner: 'remote',room: 'home',body: ['work','carry','move'],priority: 0,readyAt: 0,expiresAt: 100 },
        { id: 'courier',name: 'courier',owner: 'remote',room: 'home',body: ['carry','move'],priority: 1,readyAt: 0,expiresAt: 100 },
      ],spawns: [{ id: 'spawn',room: 'home',availableAt: 0 }],liveNames: new Set(),unaffordable: 'skip',
      funding: { capacity: 300,initialEnergy: 300,refills: [] },cash: { homeEnergy: 300,protectedEnergy: 0,horizon: 100,readyAt: 0,selfHarvestedConstruction: 4,flows: [] } } } };
}
test('funded workers construct, harvest, hand off, collect and return before receipts exist',() => {
  const result = forecastStartupDelivery(input());
  expect(result.spawning.births.map(birth => [birth.request,birth.activeAt])).toEqual([['miner',9],['courier',15]]);
  expect(result.construction.completeAt).toBe(13);
  // 25 harvest actions fill CARRY50 (frames13..37); handoff38, collect39, unload42, observed43.
  expect(result.delivery.firstDeliveryAt).toBe(43);
  expect(result.delivery.receipts[0]).toEqual({ tick: 43,energy: 50,request: 'courier' });
  expect(result.delivery.deliveredEnergy).toBe(96);
  expect(result.cash).toMatchObject({ birthEnergy: 300,deliveredEnergy: 96,endingEnergy: 96,constructionRecoveryMargin: -208,firstRecoveryAt: null });
});
test('all mined energy is conserved across construction, container, workers and receipts',() => {
  const result = forecastStartupDelivery(input()), d = result.delivery, c = result.construction;
  expect(100+c.regeneratedEnergy+d.regeneratedEnergy-c.harvestedEnergy-d.harvestedEnergy).toBe(d.source.energy);
  expect(c.harvestedEnergy+d.harvestedEnergy).toBe(c.constructionEnergy+d.deliveredEnergy+d.containerEnergy+d.minerCargoEnergy+d.courierCargoEnergy+d.unusedMinerCargoEnergy+d.uncapturedOverflowEnergy);
});
test('without a funded courier all output stays remote instead of becoming assumed income',() => {
  const view = input(); view.project.spawning.funding.initialEnergy = 200;
  const result = forecastStartupDelivery(view);
  expect(result.spawning.unscheduled).toEqual([{ request: 'courier',reason: 'expired' }]);
  expect(result.delivery).toMatchObject({ deliveredEnergy: 0,firstDeliveryAt: null,containerEnergy: 96 });
});
test('without completed construction there is no source collection or remote credit',() => {
  const view = input(); view.project.remainingProgress = 1000; view.project.spawning.cash.horizon = 30;
  expect(forecastStartupDelivery(view).delivery).toMatchObject({ deliveredEnergy: 0,containerEnergy: 0,harvestedEnergy: 0,receipts: [] });
});
test('a courier cannot collect energy handed off later in the same frame',() => {
  const view = input(); view.project.spawning.cash.horizon = 42;
  const result = forecastStartupDelivery(view);
  expect(result.delivery.receipts).toEqual([]); expect(result.delivery.courierCargoEnergy).toBe(50);
  view.project.spawning.cash.horizon = 43;
  expect(forecastStartupDelivery(view).delivery.receipts[0]?.tick).toBe(43);
});
test('multiple couriers share container stock and cannot duplicate delivery income',() => {
  const view = input(); view.project.spawning.spawns = [{ id: 'a',room: 'home',availableAt: 0 },{ id: 'b',room: 'home',availableAt: 0 }];
  view.project.spawning.cash.homeEnergy = 400; view.project.spawning.funding.capacity = 400; view.project.spawning.funding.initialEnergy = 400;
  view.project.spawning.requests = [...view.project.spawning.requests,{ ...view.project.spawning.requests[1]!,id: 'second',name: 'second' }];
  view.couriers = [...view.couriers,{ ...view.couriers[0]!,request: 'second' }];
  const result = forecastStartupDelivery(view);
  expect(result.delivery.deliveredEnergy).toBe(96);
  expect(result.delivery.receipts.filter(receipt => receipt.tick === 43).reduce((sum,receipt) => sum+receipt.energy,0)).toBe(50);
});
test('finite retirement and return feasibility block late collection even with remote stock',() => {
  const view = input(); view.couriers = [{ ...view.couriers[0]!,retireTicks: 1490 }];
  expect(forecastStartupDelivery(view).delivery.deliveredEnergy).toBe(0);
  view.couriers = [{ ...view.couriers[0]!,retireTicks: 0,returnTicks: 1499 }];
  expect(forecastStartupDelivery(view).delivery.deliveredEnergy).toBe(0);
});
test('capacity, worker roles, unsupported bodies and batches fail explicitly; input stays detached',() => {
  const view = input(), before = JSON.stringify(view); forecastStartupDelivery(view); expect(JSON.stringify(view)).toBe(before);
  view.containerCapacity = 0; expect(() => forecastStartupDelivery(view)).toThrow(); view.containerCapacity = 2000;
  view.couriers = [{ ...view.couriers[0]!,request: 'miner' }]; expect(() => forecastStartupDelivery(view)).toThrow('identity');
  view.couriers = [{ request: 'courier',outboundTicks: 1,returnTicks: 2,retireTicks: 10,minimumBatch: 51 }];
  expect(() => forecastStartupDelivery(view)).toThrow('batch');
});

test('explicit task collection and receipt delays postpone credits and consume courier service',() => {
  const view = input(); view.couriers = [{ ...view.couriers[0]!,collectionTicks: 3,deliveryTicks: 4 }];
  expect(forecastStartupDelivery(view).delivery.firstDeliveryAt).toBe(48);
  view.couriers = [{ ...view.couriers[0]!,collectionTicks: 0 }];
  expect(() => forecastStartupDelivery(view)).toThrow('delay');
});

test('natural service ends and explicitly funded successor workers conserve energy across a long horizon',() => {
  const view = input(); view.project.spawning.cash.horizon = 3200;
  view.project.spawning.cash.homeEnergy = 600; view.project.spawning.funding.capacity = 600; view.project.spawning.funding.initialEnergy = 600;
  const miner = view.project.spawning.requests[0]!, courier = view.project.spawning.requests[1]!;
  view.project.spawning.requests = [miner,courier,{ ...miner,id: 'miner-next',name: 'miner-next',readyAt: 1500,expiresAt: 3000 },
    { ...courier,id: 'courier-next',name: 'courier-next',readyAt: 1500,expiresAt: 3000 }];
  view.project.workers = [...view.project.workers,{ ...view.project.workers[0]!,request: 'miner-next' }];
  view.couriers = [...view.couriers,{ ...view.couriers[0]!,request: 'courier-next' }];
  const result = forecastStartupDelivery(view), c = result.construction, d = result.delivery;
  expect(result.spawning.births).toHaveLength(4);
  expect(d.receipts.some(receipt => receipt.request === 'courier-next')).toBe(true);
  expect(d.receipts.every(receipt => receipt.tick < 3040)).toBe(true);
  expect(100+c.regeneratedEnergy+d.regeneratedEnergy-c.harvestedEnergy-d.harvestedEnergy).toBe(d.source.energy);
  expect(c.harvestedEnergy+d.harvestedEnergy).toBe(c.constructionEnergy+d.deliveredEnergy+d.containerEnergy+d.minerCargoEnergy+d.courierCargoEnergy+d.unusedMinerCargoEnergy+d.uncapturedOverflowEnergy);
});
test('small full containers impose backpressure without disappearing harvested cargo',() => {
  const view = input(); view.containerCapacity = 3; view.couriers = [];
  const result = forecastStartupDelivery(view), c = result.construction, d = result.delivery;
  expect(d.containerEnergy).toBe(3); expect(d.minerCargoEnergy).toBe(50); expect(d.uncapturedOverflowEnergy).toBe(1);
  expect(c.harvestedEnergy+d.harvestedEnergy).toBe(c.constructionEnergy+d.containerEnergy+d.minerCargoEnergy+d.uncapturedOverflowEnergy);
});
