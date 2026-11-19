import { expect, test } from 'vitest';
import { startupDeliveryInput } from '../fixtures/startup-delivery';
import { forecastStartupDelivery } from '../../src/capabilities/economy/startup/delivery';
import { createStartupContainer } from '../../src/capabilities/economy/startup/container';
function input() {
  const view = startupDeliveryInput(); view.project.remainingProgress = 0; view.project.spawning.cash.selfHarvestedConstruction = 0;
  view.container = { hits: 19,hitsMax: 100,decayAmount: 1,decayInterval: 99,decayIn: 99,repairPolicy: { criticalFraction: 0.2,energyReserve: 0 } };
  return view;
}
test('critical repair consumes remote cargo and the worker action rather than free labor or home cash',() => {
  const view = input(); view.project.spawning.cash.horizon = 10;
  const result = forecastStartupDelivery(view);
  expect(result.maintenance).toMatchObject({ repairedHits: 81,repairEnergy: 1,hits: 100 });
  expect(result.delivery).toMatchObject({ harvestedEnergy: 2,minerCargoEnergy: 1 });
  expect(result.cash).toMatchObject({ homeConstructionEnergy: 0,upkeepEnergy: 0,endingEnergy: 0 });
});
test('ordinary critical-energy reserve preserves harvesting rather than spending every small load',() => {
  const view = input(); view.project.spawning.cash.horizon = 10; view.container.repairPolicy = { criticalFraction: 0.2,energyReserve: 20 };
  const result = forecastStartupDelivery(view);
  expect(result.maintenance.repairEnergy).toBe(0); expect(result.delivery.minerCargoEnergy).toBe(4);
});
test('source depletion allows routine repair even above the critical damage threshold',() => {
  const view = input(); view.project.spawning.cash.horizon = 10; view.project.source.energy = 1; view.project.source.regenerationIn = 300;
  view.container.hits = 90; view.container.repairPolicy = { criticalFraction: 0.2,energyReserve: 20 };
  const result = forecastStartupDelivery(view);
  expect(result.maintenance).toMatchObject({ repairedHits: 10,repairEnergy: 1,hits: 100 });
  expect(result.delivery).toMatchObject({ harvestedEnergy: 1,minerCargoEnergy: 0 });
});
test('unmaintained failure stops new source collection and records unrecovered container stock',() => {
  const view = input(); view.couriers = []; view.container = { ...view.container,hits: 5,decayAmount: 5,decayInterval: 100,decayIn: 40,repairPolicy: null };
  const result = forecastStartupDelivery(view), d = result.delivery;
  expect(result.maintenance).toMatchObject({ destroyedAt: 40,unrecoveredEnergy: 50,hits: 0 });
  expect(d).toMatchObject({ deliveredEnergy: 0,containerEnergy: 0,minerCargoEnergy: 10,harvestedEnergy: 60 });
  expect(d.harvestedEnergy).toBe(d.minerCargoEnergy+result.maintenance.unrecoveredEnergy);
});
test('already loaded couriers can return after the remote container fails',() => {
  const view = startupDeliveryInput(); view.container = { ...view.container,hits: 5,decayAmount: 5,decayIn: 28,repairPolicy: null };
  const result = forecastStartupDelivery(view);
  expect(result.maintenance.destroyedAt).toBe(41);
  expect(result.delivery.receipts).toEqual([{ tick: 43,energy: 50,request: 'courier' }]);
  expect(result.cash.deliveredEnergy).toBe(50);
});
test('a critical repair action before same-frame decay can preserve the container',() => {
  const view = input(); view.container = { ...view.container,hits: 5,decayAmount: 5,decayIn: 11 };
  view.project.spawning.cash.horizon = 10;
  expect(forecastStartupDelivery(view).maintenance).toMatchObject({ hits: 95,destroyedAt: null,repairedHits: 95,repairEnergy: 1,decayEvents: 1 });
});
test('empty construction labor does not invent repair workers after infrastructure becomes ready',() => {
  const view = input(); view.project.workers = []; view.container.decayIn = 1; view.container.decayAmount = 100;
  const result = forecastStartupDelivery(view);
  expect(result.maintenance).toMatchObject({ destroyedAt: 1,repairEnergy: 0,hits: 0 });
  expect(result.delivery.deliveredEnergy).toBe(0);
});
test('invalid maintenance facts, skipped frames and resurrection fail explicitly',() => {
  const view = input(); view.container.decayIn = 100;
  expect(() => forecastStartupDelivery(view)).toThrow('phase');
  const container = createStartupContainer({ ...view.container,decayIn: 1,decayAmount: 100 });
  container.finish(0,0); expect(() => container.repair(5,1)).toThrow('destroyed');
  expect(() => container.finish(0,0)).toThrow('frame');
});
test('maintenance facts and policies are detached from subsequent caller mutation',() => {
  const view = input(), container = createStartupContainer(view.container);
  view.container.hitsMax = 1000; view.container.decayAmount = 100;
  expect(container.repair(2,1)).toBe(1); container.finish(0,0);
  expect(container.result()).toMatchObject({ hits: 100,repairedHits: 81 });
});
