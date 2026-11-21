import { expect, test } from 'vitest';
import { createStartupHousehold } from '../../src/capabilities/economy/startup/household/timeline';
import { startupDeliveryInput } from '../fixtures/startup-delivery';
import type { StartupHouseholdInput } from '../../src/capabilities/economy/startup/household/model';
function input(): StartupHouseholdInput {
  const spawning = startupDeliveryInput().project.spawning;
  spawning.requests = [
    { id: 'distributor',name: 'distributor',owner: 'household',room: 'home',body: ['carry','carry','move'],priority: 0,readyAt: 0,expiresAt: 31 },
    { id: 'source',name: 'source',owner: 'remote',room: 'home',body: ['work','carry','move'],priority: 1,readyAt: 0,expiresAt: 31 },
  ];
  spawning.cash = { homeEnergy: 450,protectedEnergy: 0,horizon: 30,readyAt: 0,selfHarvestedConstruction: 0,flows: [] };
  spawning.funding = { capacity: 300,initialEnergy: 150,refills: [] };
  return { spawning,endpointEnergy: 300,redistribution: { horizon: 30,trips: [9,14].map((pickupAt,index) => ({ id: 'trip'+index,request: 'distributor',pickupAt,loadedTicks: 2,returnTicks: 1,energy: 100 })) } };
}
test('paid household body and two physical trips fund a later body only after deposit settlement',() => {
  const view = input(), model = createStartupHousehold(view), births: [number,string][] = [];
  for (let tick = 0; tick <= 30; tick++) { births.push(...model.begin(tick).map(birth => [tick,birth.request] as [number,string])); model.finish(); }
  expect(births).toEqual([[0,'distributor'],[18,'source']]);
  expect(model.result()).toMatchObject({ cash: { birthEnergy: 350,endingEnergy: 100,deliveredEnergy: 0 },funding: { refilledEnergy: 200 },redistribution: { endpointEnergy: 100,delivered: 200,cargo: 0 } });
});
test('an unaffordable distributor cannot provide free service from inaccessible bank stock',() => {
  const view = input(); view.spawning.funding.initialEnergy = 0; const model = createStartupHousehold(view);
  for (let tick = 0; tick <= 30; tick++) { model.begin(tick); model.finish(); }
  expect(model.result()).toMatchObject({ births: [],cash: { birthEnergy: 0,endingEnergy: 450 },redistribution: { picked: 0,endpointEnergy: 300 } });
});
test('unspecified outside cash does not become reachable endpoint stock',() => {
  const view = input(); view.endpointEnergy = 0; view.spawning.cash.homeEnergy = 150;
  view.spawning.cash.flows = [{ id: 'outside',kind: 'delivery',energy: 200,firstTick: 5,interval: null,occurrences: 1 }]; const model = createStartupHousehold(view);
  for (let tick = 0; tick <= 30; tick++) { model.begin(tick); model.finish(); }
  expect(model.result()).toMatchObject({ cash: { deliveredEnergy: 200,birthEnergy: 150 },redistribution: { picked: 0,endpointEnergy: 0 } });
});
test('same-frame endpoint receipt cannot fill an earlier empty pickup or retroactively admit a body',() => {
  const view = input(); view.endpointEnergy = 0; view.spawning.cash.homeEnergy = 150;
  view.spawning.requests = view.spawning.requests.map(request => request.id === 'source' ? { ...request,body: ['carry','move'] } : request);
  const model = createStartupHousehold(view), admissions: number[] = [];
  for (let tick = 0; tick <= 30; tick++) {
    if (model.begin(tick).some(birth => birth.request === 'source')) admissions.push(tick);
    model.finish(tick === 9 ? [{ id: 'remote-income',tick: 9,energy: 200 }] : []);
  }
  expect(admissions).toEqual([18]); expect(model.checkpoint().redistribution.trips[0]?.phase).toBe('missed');
  expect(model.result()).toMatchObject({ cash: { deliveredEnergy: 200,birthEnergy: 250,endingEnergy: 100 },redistribution: { delivered: 100,endpointEnergy: 100 } });
});
test('in-flight JSON reset preserves funding/cargo and gives identical final cash without duplicate transfers',() => {
  const view = input(), full = createStartupHousehold(view), partial = createStartupHousehold(view);
  for (let tick = 0; tick <= 30; tick++) { full.begin(tick); full.finish(); }
  for (let tick = 0; tick <= 10; tick++) { partial.begin(tick); partial.finish(); }
  const wire = JSON.parse(JSON.stringify(partial.checkpoint())), resumed = createStartupHousehold(view,wire);
  expect(wire.redistribution.trips[0].cargo).toBe(100);
  for (let tick = 11; tick <= 30; tick++) { resumed.begin(tick); resumed.finish(); }
  expect(resumed.result()).toEqual(full.result()); expect(resumed.checkpoint()).toEqual(full.checkpoint());
});
function blockedInput() {
  const view = input(); view.spawning.requests = view.spawning.requests.slice(0,1); view.spawning.funding.capacity = 150;
  view.spawning.cash.horizon = 1510; view.redistribution.horizon = 1510; return view;
}
test('loaded expiry charges exactly once, including after reset, while internal transfers never count as income',() => {
  const view = blockedInput(), model = createStartupHousehold(view);
  for (let tick = 0; tick <= 18; tick++) { model.begin(tick); model.finish(); }
  const resumed = createStartupHousehold(view,JSON.parse(JSON.stringify(model.checkpoint())));
  for (let tick = 19; tick <= 1510; tick++) { resumed.begin(tick); resumed.finish(); }
  expect(resumed.result()).toMatchObject({ cash: { birthEnergy: 150,upkeepEnergy: 50,deliveredEnergy: 0,endingEnergy: 250 },redistribution: { delivered: 150,lost: 50,endpointEnergy: 100 } });
  expect(resumed.result().flows.filter(flow => flow.id.startsWith('household-loss:'))).toHaveLength(1);
  expect(createStartupHousehold(view,resumed.checkpoint()).result()).toEqual(resumed.result());
});
test('other expenses cannot spend reserved in-transit cargo',() => {
  const view = blockedInput(); view.spawning.cash.flows = [{ id: 'building',kind: 'home-construction',energy: 260,firstTick: 18,interval: null,occurrences: 1 }];
  const model = createStartupHousehold(view); for (let tick = 0; tick < 18; tick++) { model.begin(tick); model.finish(); }
  const before = model.checkpoint(); expect(() => model.begin(18)).toThrow('reserved cargo'); expect(model.checkpoint()).toEqual(before);
});
test('restore rejects forged endpoint cash and paid-worker lifetime',() => {
  const view = input(), model = createStartupHousehold(view); for (let tick = 0; tick <= 10; tick++) { model.begin(tick); model.finish(); }
  const stock = model.checkpoint(); stock.endpointEnergy++; expect(() => createStartupHousehold(view,stock)).toThrow('conservation');
  const life = model.checkpoint(); life.redistribution.trips[0]!.expiresAt!++; expect(() => createStartupHousehold(view,life)).toThrow('lifetime');
});
test('mixed legacy refill ownership and unrepresented household bodies are rejected',() => {
  const view = input(); view.spawning.funding.refills = [{ id: 'free-refill',energy: 100,firstTick: 10,interval: null,occurrences: 1 }]; expect(() => createStartupHousehold(view)).toThrow('Conflicting');
  const missing = input(); missing.redistribution.trips = [{ ...missing.redistribution.trips[0]!,request: 'unknown' }]; expect(() => createStartupHousehold(missing)).toThrow('paid courier');
});
