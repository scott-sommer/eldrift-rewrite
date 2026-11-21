import { expect, test } from 'vitest';
import { createStartupHousehold } from '../../src/capabilities/economy/startup/household/timeline';
import { startupDeliveryInput } from '../fixtures/startup-delivery';
import type { StartupHouseholdInput } from '../../src/capabilities/economy/startup/household/model';
function input(): StartupHouseholdInput {
  const spawning = startupDeliveryInput().project.spawning;
  spawning.requests = [
    { id: 'distributor',name: 'distributor',owner: 'household',room: 'home',body: ['carry','carry','move'],priority: 0,readyAt: 0,expiresAt: 36 },
    { id: 'source',name: 'source',owner: 'remote',room: 'home',body: ['work','work','move'],priority: 1,readyAt: 28,expiresAt: 36 },
  ];
  spawning.spawns = [{ id: 'spawn',room: 'home',availableAt: 0 }];
  spawning.cash = { homeEnergy: 650,protectedEnergy: 0,horizon: 35,readyAt: 0,selfHarvestedConstruction: 0,flows: [] };
  spawning.funding = { capacity: 350,initialEnergy: 150,refills: [],energyLayout: {
    structures: [{ id: 'spawn',kind: 'spawn',energy: 150,capacity: 300 },{ id: 'extension',kind: 'extension',energy: 0,capacity: 50 }],
    orders: [{ spawn: 'spawn',structures: ['spawn','extension'] }],
  } };
  return { spawning,endpointEnergy: 500,redistribution: { horizon: 35,trips: [9,14,19,24].map((pickupAt,index) => ({ id: 'trip'+index,request: 'distributor',destination: 'spawn',pickupAt,loadedTicks: 2,returnTicks: 1,energy: 100 })) } };
}
function through(model: ReturnType<typeof createStartupHousehold>, from: number, last: number): void {
  for (let tick = from; tick <= last; tick++) { model.begin(tick); model.finish(); }
}
test('cargo waits at its full destination despite free extension space; a later birth frees real space',() => {
  const view = input(), full = createStartupHousehold(view); through(full,0,27);
  const saved = full.checkpoint(); expect(saved.format).toBe(2);
  expect(saved.redistribution.trips[3]).toMatchObject({ cargo: 100,delivered: 0,phase: 'carrying' });
  expect(saved.spawning.energy!.points).toEqual([{ id: 'spawn',energy: 300 },{ id: 'extension',energy: 0 }]);
  const resumed = createStartupHousehold(view,JSON.parse(JSON.stringify(saved)));
  expect(resumed.begin(28)).toMatchObject([{ request: 'source',cost: 250 }]); expect(resumed.finish()).toMatchObject({ delivered: 100 });
  through(resumed,29,35); through(full,28,35);
  expect(resumed.result()).toEqual(full.result()); expect(resumed.checkpoint()).toEqual(full.checkpoint());
  expect(resumed.result()).toMatchObject({ funding: { endingSpawnEnergy: 150,refilledEnergy: 400 },cash: { endingEnergy: 250,birthEnergy: 400,deliveredEnergy: 0 },redistribution: { cargo: 0,delivered: 400,endpointEnergy: 100 } });
});
test('paid-trip links refuse reassigned deposits even when physical and aggregate totals still match',() => {
  const view = input(), model = createStartupHousehold(view); through(model,0,27);
  const wire = model.checkpoint(); const deposit = wire.spawning.energy!.events.find(event => event.kind === 'deposit')!;
  deposit.holder = 'trip1'; expect(() => createStartupHousehold(view,wire)).toThrow('lifetime');
  const downgrade = model.checkpoint(); downgrade.format = 1; expect(() => createStartupHousehold(view,downgrade)).toThrow('binding');
});
test('destination and full physical stock are required; reserved stock cannot also be endpoint cash',() => {
  const view = input(); view.redistribution.trips[0]!.destination = 'unknown'; expect(() => createStartupHousehold(view)).toThrow('destination');
  view.redistribution.trips[0]!.destination = 'spawn';
  view.spawning.funding.energyLayout!.structures[0]!.reservedEnergy = 50; view.spawning.funding.initialEnergy = 100; view.spawning.funding.capacity = 300;
  view.endpointEnergy = 550; expect(() => createStartupHousehold(view)).toThrow('overlaps');
});

test('blocked addressed cargo expires once and keeps point stock and loss accounting consistent after reset',() => {
  const view = input(); view.spawning.requests = view.spawning.requests.slice(0,1);
  view.spawning.cash.horizon = 1510; view.redistribution.horizon = 1510;
  const model = createStartupHousehold(view); through(model,0,27);
  const resumed = createStartupHousehold(view,JSON.parse(JSON.stringify(model.checkpoint()))); through(resumed,28,1510);
  expect(resumed.result()).toMatchObject({ cash: { endingEnergy: 400,birthEnergy: 150,upkeepEnergy: 100 },redistribution: { delivered: 300,lost: 100,cargo: 0,endpointEnergy: 100 } });
  expect(createStartupHousehold(view,resumed.checkpoint()).result()).toEqual(resumed.result());
});
