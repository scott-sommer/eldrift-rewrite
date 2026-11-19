import { expect, test } from 'vitest';
import { startupDeliveryInput as input } from '../fixtures/startup-delivery';
import { forecastStartupDelivery } from '../../src/capabilities/economy/startup/delivery';
import { createStartupSink } from '../../src/capabilities/economy/startup/sink';
test('a full home holds loaded cargo and cannot generate delivery cash',() => {
  const view = input(); view.homeSink = { capacity: 100,freeCapacity: 0,changes: [] };
  const result = forecastStartupDelivery(view);
  expect(result.delivery).toMatchObject({ deliveredEnergy: 0,firstDeliveryAt: null,courierCargoEnergy: 50,unreturnedCourierEnergy: 0 });
  expect(result.cash.deliveredEnergy).toBe(0); expect(result.homeSink.acceptedEnergy).toBe(0);
});
test('partial home capacity credits only accepted energy and retains the rest in courier cargo',() => {
  const view = input(); view.homeSink = { capacity: 100,freeCapacity: 30,changes: [] };
  const result = forecastStartupDelivery(view);
  expect(result.delivery).toMatchObject({ deliveredEnergy: 30,courierCargoEnergy: 20 });
  expect(result.delivery.receipts).toEqual([{ tick: 43,energy: 30,request: 'courier' }]);
  expect(result.cash.deliveredEnergy).toBe(30); expect(result.homeSink.remainingCapacity).toBe(0);
});
test('same-frame capacity releases settle after unloading and only enable the following frame',() => {
  const view = input(); view.homeSink = { capacity: 100,freeCapacity: 0,changes: [{ id: 'local-use',kind: 'release',energy: 50,firstTick: 50,interval: null,occurrences: 1 }] };
  const result = forecastStartupDelivery(view);
  expect(result.delivery.receipts).toEqual([{ tick: 52,energy: 50,request: 'courier' }]);
  expect(result.cash.deliveredEnergy).toBe(50);
});
test('competing sink occupancy is applied even before container readiness, without inventing cash',() => {
  const view = input(); view.homeSink = { capacity: 100,freeCapacity: 100,changes: [{ id: 'other-owner',kind: 'occupy',energy: 100,firstTick: 1,interval: null,occurrences: 1 }] };
  const result = forecastStartupDelivery(view);
  expect(result.delivery.deliveredEnergy).toBe(0); expect(result.cash.deliveredEnergy).toBe(0);
});
test('capacity shared by simultaneous courier unloads cannot be spent twice',() => {
  const view = input(); view.homeSink = { capacity: 70,freeCapacity: 70,changes: [] };
  view.project.spawning.spawns = [{ id: 'a',room: 'home',availableAt: 0 },{ id: 'b',room: 'home',availableAt: 0 }];
  view.project.spawning.cash.homeEnergy = 400; view.project.spawning.funding.capacity = 400; view.project.spawning.funding.initialEnergy = 400;
  view.project.spawning.requests = [...view.project.spawning.requests,{ ...view.project.spawning.requests[1]!,id: 'second',name: 'second' }];
  view.couriers = [...view.couriers,{ ...view.couriers[0]!,request: 'second' }];
  const result = forecastStartupDelivery(view);
  expect(result.delivery.deliveredEnergy).toBe(70); expect(result.homeSink.acceptedEnergy).toBe(70);
  expect(result.cash.deliveredEnergy).toBe(70);
});
test('loaded expiry under a blocked sink remains an explicit unreturned disposition',() => {
  const view = input(); view.homeSink = { capacity: 100,freeCapacity: 0,changes: [] }; view.project.spawning.cash.horizon = 1600;
  const result = forecastStartupDelivery(view), c = result.construction, d = result.delivery;
  expect(d).toMatchObject({ deliveredEnergy: 0,courierCargoEnergy: 0,unreturnedCourierEnergy: 50 });
  expect(c.harvestedEnergy+d.harvestedEnergy).toBe(c.constructionEnergy+d.deliveredEnergy+d.containerEnergy+d.minerCargoEnergy+d.unusedMinerCargoEnergy+d.uncapturedOverflowEnergy+d.unreturnedCourierEnergy+result.maintenance.repairEnergy+result.maintenance.unrecoveredEnergy);
});
test('infeasible capacity-release assumptions and invalid initial facts fail explicitly',() => {
  const view = input(); view.homeSink.freeCapacity = view.homeSink.capacity+1;
  expect(() => forecastStartupDelivery(view)).toThrow('initial');
  view.homeSink = { capacity: 100,freeCapacity: 100,changes: [{ id: 'impossible',kind: 'release',energy: 1,firstTick: 0,interval: null,occurrences: 1 }] };
  expect(() => forecastStartupDelivery(view)).toThrow('Infeasible');
});
test('the reusable sink enforces frame order and rejects negative or unbounded transfers',() => {
  const view = input(), sink = createStartupSink(view.homeSink,view.project.spawning.cash);
  expect(() => sink.take(1)).toThrow(); expect(() => sink.prepare(Infinity)).toThrow();
  sink.prepare(0); expect(() => sink.take(-1)).toThrow(); expect(() => sink.prepare(1)).toThrow();
  sink.finish(); expect(() => sink.finish()).toThrow();
});

test('successive partial unloads each observe transfer delay and retain the outstanding cargo',() => {
  const view = input(); view.homeSink = { capacity: 100,freeCapacity: 30,changes: [
    { id: 'first-use',kind: 'release',energy: 10,firstTick: 50,interval: null,occurrences: 1 },
    { id: 'second-use',kind: 'release',energy: 10,firstTick: 60,interval: null,occurrences: 1 },
  ] };
  const result = forecastStartupDelivery(view);
  expect(result.delivery.receipts.map(receipt => [receipt.tick,receipt.energy])).toEqual([[43,30],[52,10],[62,10]]);
  expect(result.cash.deliveredEnergy).toBe(50);
});
