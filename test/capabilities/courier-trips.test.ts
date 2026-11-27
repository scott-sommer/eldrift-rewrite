import { expect,test } from 'vitest';
import { createTransitPlan } from '../../src/capabilities/movement/transit/plan';
import { advanceStartupCourierTrips } from '../../src/capabilities/economy/startup/courier-trips/frame';
import { advanceStartupCouriers } from '../../src/capabilities/economy/startup/delivery-couriers';
import type { StartupCourierRoutes,StartupCourierTrip } from '../../src/capabilities/economy/startup/courier-trips/model';
import type { StartupCourierState,StartupDeliveryForecast } from '../../src/capabilities/economy/startup/delivery-model';
import { createStartupSink } from '../../src/capabilities/economy/startup/sink';
const point = (x: number) => ({ room: 'W0N1',x,y: 25 });
function fixture(deliveryTicks = 1,partial = false) {
  const plan = (origin: number,path: number[]) => createTransitPlan({ unit: 'courier',owner: 'cohort',priority: 0,weight: 0,recovery: 4,origin: point(origin),path: path.map(point) });
  const routes: StartupCourierRoutes[] = [{ request: 'courier',activeAt: 0,approach: plan(10,[11,12]),empty: plan(10,[11,12]),loaded: plan(12,[11,10]) }];
  const workers: StartupCourierState[] = [{ request: 'courier',outboundTicks: 0,returnTicks: 0,retireTicks: 0,minimumBatch: 1,collectionTicks: 1,deliveryTicks,capacity: 100,expiresAt: 100,stopAt: 90,nextAt: 0,phase: 'collect',cargo: 0 }];
  const delivery: StartupDeliveryForecast = { firstDeliveryAt: null,deliveredEnergy: 0,harvestedEnergy: 100,regeneratedEnergy: 0,unreturnedCourierEnergy: 0,overflowEnergy: 0,uncapturedOverflowEnergy: 0,containerEnergy: 100,minerCargoEnergy: 0,courierCargoEnergy: 0,unusedMinerCargoEnergy: 0,projectedThrough: 0,source: { energy: 0,capacity: 100,regenerationTicks: 300,regenerationIn: null },receipts: [] };
  const sink = createStartupSink({ capacity: 1000,freeCapacity: partial ? 50 : 1000,changes: partial ? [{ id: 'use',kind: 'release',energy: 50,firstTick: 8,interval: null,occurrences: 1 }] : [] },{ homeEnergy: 0,protectedEnergy: 0,horizon: 30,readyAt: 0,selfHarvestedConstruction: 0,flows: [] });
  let trips: StartupCourierTrip[] = [];
  function frame(tick: number,blocked = false) {
    sink.prepare(tick);
    trips = advanceStartupCourierTrips(routes,trips,workers,tick,blocked ? [{ unit: 'miner',position: point(11) }] : [],{ legal: () => true,terrain: () => 2 },ready => advanceStartupCouriers(workers,delivery,tick,30,sink,ready));
    sink.finish(); trips = JSON.parse(JSON.stringify(trips));
    return trips;
  }
  return { routes,workers,delivery,frame,sink };
}
test('collection and settlement wait for actual transit despite zero scalar travel estimates',() => {
  const f = fixture();
  f.frame(0); f.frame(1); expect(f.workers[0]!.cargo).toBe(0);
  f.frame(2); expect(f.workers[0]!.cargo).toBe(100);
  f.frame(3); f.frame(4); expect(f.delivery.receipts).toEqual([]);
  f.frame(5); expect(f.delivery.receipts).toEqual([{ tick: 6,energy: 100,request: 'courier' }]);
  expect(f.delivery.containerEnergy+f.workers[0]!.cargo+f.delivery.deliveredEnergy).toBe(100);
  expect(f.sink.result().acceptedEnergy).toBe(100);
});
test('a shared stationary blocker shifts collection and receipt without inventing income',() => {
  const f = fixture(); f.frame(0,true); f.frame(1,true);
  for (let tick = 2; tick <= 7; tick++) f.frame(tick);
  expect(f.delivery.receipts).toEqual([{ tick: 8,energy: 100,request: 'courier' }]);
  expect(f.delivery.deliveredEnergy).toBe(100);
});
test('multi-frame delivery service delay does not postpone itself indefinitely',() => {
  const f = fixture(2);
  for (let tick = 0; tick <= 6; tick++) f.frame(tick);
  expect(f.delivery.receipts).toEqual([{ tick: 7,energy: 100,request: 'courier' }]);
});

test('partial delivery waits for physical sink capacity and preserves service cadence',() => {
  const f = fixture(2,true);
  for (let tick = 0; tick <= 9; tick++) f.frame(tick);
  expect(f.delivery.receipts).toEqual([{ tick: 7,energy: 50,request: 'courier' },{ tick: 11,energy: 50,request: 'courier' }]);
  expect(f.workers[0]!.cargo).toBe(0);
});
test('missing trip history cannot be reconstructed as a fresh already-active journey',() => {
  const f = fixture();
  expect(() => f.frame(1)).toThrow('opening history');
});
