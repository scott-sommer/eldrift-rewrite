import { expect,test } from 'vitest';
import { advanceStartupCouriers } from '../../src/capabilities/economy/startup/delivery-couriers';
import { createStartupSink } from '../../src/capabilities/economy/startup/sink';
import type { StartupDeliveryForecast } from '../../src/capabilities/economy/startup/delivery-model';
import { advanceStartupCourierGroups } from '../../src/capabilities/economy/startup/courier-trips/groups';
import { createTransitPlan } from '../../src/capabilities/movement/transit/plan';
import type { StartupCourierGroup } from '../../src/capabilities/economy/startup/courier-trips/groups';
const point = (x: number,y = 25) => ({ room: 'W0N1',x,y });
const ports = { legal: () => true,terrain: () => 2 as const };
function group(name: string,vertical = false): StartupCourierGroup {
  const origin = vertical ? point(11,24) : point(10),collection = vertical ? point(11,26) : point(12);
  const plan = (from: typeof origin,path: typeof origin[]) => createTransitPlan({ unit: name,order: name,owner: 'owner:'+name,priority: 0,weight: 0,recovery: 2,origin: from,path });
  return { source: 'source:'+name,previous: [],routes: [{ request: name,activeAt: 0,approach: plan(origin,[point(11),collection]),empty: plan(origin,[point(11),collection]),loaded: plan(collection,[point(11),origin]) }],
    workers: [{ request: name,outboundTicks: 0,returnTicks: 0,retireTicks: 0,minimumBatch: 1,collectionTicks: 1,deliveryTicks: 1,capacity: 50,expiresAt: 100,stopAt: 90,nextAt: 0,phase: 'collect',cargo: 0 }],service() {} };
}
test('two sources compete in one traffic resolution independent of supplied group order',() => {
  const a = group('a'),b = group('b',true);
  for (const plan of [a.routes[0]!.approach,a.routes[0]!.empty,a.routes[0]!.loaded]) plan.order = 'z';
  for (const plan of [b.routes[0]!.approach,b.routes[0]!.empty,b.routes[0]!.loaded]) plan.order = 'a';
  const next = advanceStartupCourierGroups([b,a],0,[],ports);
  expect(next.find(row => row.source === a.source)!.trips[0]!.transit.position).toEqual(point(10));
  expect(next.find(row => row.source === b.source)!.trips[0]!.transit.position).toEqual(point(11));
  const reverse = advanceStartupCourierGroups([a,b],0,[],ports);
  expect(reverse).toEqual([...next].reverse());
});
test('source service retains ownership and global name order when sharing scarce capacity',() => {
  const a = group('a'),b = group('b',true),served: string[] = [];
  const sink = createStartupSink({ capacity: 50,freeCapacity: 50,changes: [] },{ homeEnergy: 0,protectedEnergy: 0,horizon: 30,readyAt: 0,selfHarvestedConstruction: 0,flows: [] });
  const source = () : StartupDeliveryForecast => ({ firstDeliveryAt: null,deliveredEnergy: 0,harvestedEnergy: 0,regeneratedEnergy: 0,unreturnedCourierEnergy: 0,overflowEnergy: 0,uncapturedOverflowEnergy: 0,containerEnergy: 0,minerCargoEnergy: 0,courierCargoEnergy: 0,unusedMinerCargoEnergy: 0,projectedThrough: 0,source: { energy: 0,capacity: 3000,regenerationTicks: 300,regenerationIn: null },receipts: [] });
  const stocks = new Map([a,b].map(g => [g.source,source()])); sink.prepare(0);
  for (const g of [a,b]) {
    const worker = g.workers[0]!,route = g.routes[0]!;
    worker.phase = 'deliver'; worker.cargo = 50;
    route.opening = { plan: { ...route.empty,path: [] },phase: 'deliver',cargo: 50,readyAt: 0,fatigue: 0 };
    g.service = (worker,ready) => {
      if (!ready(worker,0)) return;
      served.push(g.source); advanceStartupCouriers([worker],stocks.get(g.source)!,0,30,sink,ready);
    };
  }
  const next = advanceStartupCourierGroups([b,a],0,[],ports);
  expect(served).toEqual([a.source,b.source]); expect(a.workers[0]!.cargo).toBe(0); expect(b.workers[0]!.cargo).toBe(50);
  expect(next.every(row => row.trips.length === 1)).toBe(true);
  expect(stocks.get(a.source)!.receipts).toEqual([{ tick: 1,energy: 50,request: 'a' }]);
  expect(stocks.get(b.source)!.receipts).toEqual([]); expect(sink.result().acceptedEnergy).toBe(50);
});
test('foreign source history and duplicate worker ownership refuse before service',() => {
  const a = group('a'),b = group('b'); let calls = 0; a.service = () => { calls++; };
  b.routes = a.routes;
  expect(() => advanceStartupCourierGroups([a,b],0,[],ports)).toThrow('source ownership');
  expect(() => advanceStartupCourierGroups([a,{ ...a,source: 'other' }],0,[],ports)).toThrow('grouped courier');
  expect(calls).toBe(0);
});
test('grouped trip histories resume together after JSON transfer without losing traffic waits',() => {
  const a = group('a'),b = group('b',true),groups = [a,b];
  const first = advanceStartupCourierGroups(groups,0,[],ports);
  for (const g of groups) g.previous = JSON.parse(JSON.stringify(first.find(row => row.source === g.source)!.trips));
  const next = advanceStartupCourierGroups(groups,1,[],ports);
  expect(next[0]!.trips[0]!.transit.position).toEqual(point(12));
  expect(next[1]!.trips[0]!.transit.position).toEqual(point(11));
});
