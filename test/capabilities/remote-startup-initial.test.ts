import { expect, test } from 'vitest';
import { createStartupProject, forecastStartupProject, restoreStartupProject } from '../../src/capabilities/economy/startup/project';
import { forecastStartupDelivery } from '../../src/capabilities/economy/startup/delivery';
import { startupInitialInput, initialCourier } from '../fixtures/startup-initial';
function miner() { return { id: 'paid-miner',body: ['work','carry','move'] as const,availableAt: 0,expiresAt: 10,remainingSpawnTicks: 0,retireTicks: 0,energy: 8 }; }
function buildingInput() {
  const input = startupInitialInput(); input.project.remainingProgress = 4; input.project.spawning.cash.selfHarvestedConstruction = 4;
  input.initial!.miner = miner(); input.initial!.couriers = [initialCourier()]; return input;
}
test('paid remaining miner life and cargo build immediately without another birth or duplicate investment charge',() => {
  const input = buildingInput(), result = forecastStartupProject(input);
  expect(result.spawning.births).toEqual([]); expect(result.cash.birthEnergy).toBe(0);
  expect(result.construction).toMatchObject({ completeAt: 1,constructionEnergy: 4,harvestedEnergy: 0 });
  expect(result.delivery).toMatchObject({ harvestedEnergy: 0,deliveredEnergy: 4 });
  expect(result.cash).toMatchObject({ endingEnergy: 304,homeCashSurplus: 4,constructionRecoveryMargin: -4,firstRecoveryAt: null });
  expect(result.openingAssets).toMatchObject({ energy: 8,constructionEnergyFromOpening: 4 });
});
test('opening container inventory is real cash on delivery but not newly earned project profit',() => {
  const input = startupInitialInput(); input.initial!.containerEnergy = 100; input.initial!.couriers = [initialCourier()];
  const result = forecastStartupProject(input); expect(result.delivery.deliveredEnergy).toBe(100); expect(result.delivery.harvestedEnergy).toBe(0);
  expect(result.cash).toMatchObject({ endingEnergy: 400,homeCashSurplus: 100,constructionRecoveryMargin: 0 }); expect(result.cash.birthEnergy).toBe(0);
});
test('loaded return-only workers credit the physical sink once and never begin another collection cycle',() => {
  const input = startupInitialInput(); input.initial!.containerEnergy = 100;
  input.initial!.couriers = [initialCourier({ mode: 'return-only',phase: 'deliver',energy: 50,body: ['work','carry','move'] })];
  const result = forecastStartupProject(input); expect(result.delivery).toMatchObject({ deliveredEnergy: 50,containerEnergy: 100 });
  expect(result.cash.constructionRecoveryMargin).toBe(-100); expect(result.delivery.receipts).toHaveLength(1);
});
test('expiry is processed before a later quoted arrival so dead workers cannot retain carried assets',() => {
  const input = startupInitialInput(); input.initial!.couriers = [initialCourier({ phase: 'deliver',energy: 50,availableAt: 15,expiresAt: 5 })];
  const project = createStartupProject(input); project.advance(6); const wire = project.checkpoint();
  expect(wire.delivery.unreturnedCourierEnergy).toBe(50); expect(wire.couriers[0]).toMatchObject({ cargo: 0,nextAt: null });
  const resumed = restoreStartupProject(input,JSON.parse(JSON.stringify(wire))); resumed.advance(15);
  expect(resumed.result().delivery.deliveredEnergy).toBe(0); expect(resumed.result().cash.constructionRecoveryMargin).toBe(-50);
});
test('pending miner cargo survives travel, activates at the declared arrival and remains finite',() => {
  const input = buildingInput(); input.initial!.miner!.availableAt = 5; input.initial!.miner!.expiresAt = 12;
  const project = createStartupProject(input); project.advance(5);
  expect(project.checkpoint().opening).toMatchObject({ pendingMinerEnergy: 8,minerStarted: false });
  const resumed = restoreStartupProject(input,JSON.parse(JSON.stringify(project.checkpoint()))); resumed.advance(16);
  expect(resumed.result().construction.completeAt).toBe(6); expect(resumed.result().construction.waves[0]!.endAt).toBeLessThanOrEqual(12);
});
test('unreachable initial miners expire with cargo instead of donating it to later workers',() => {
  const input = buildingInput(); input.initial!.miner!.availableAt = 15; input.initial!.miner!.expiresAt = 5;
  const result = forecastStartupProject(input); expect(result.construction.status).toBe('incomplete');
  expect(result.delivery.unusedMinerCargoEnergy).toBe(8); expect(result.openingAssets?.pendingMinerEnergy).toBe(0);
});
test('every JSON reset preserves opening inventory, construction credit, receipts and future funding',() => {
  const input = buildingInput(), expected = forecastStartupProject(input); let project = createStartupProject(input);
  for (let frame = 0; frame < 21; frame++) { project.advance(1); project = restoreStartupProject(input,JSON.parse(JSON.stringify(project.checkpoint()))); }
  expect(project.result()).toEqual(expected); expect(project.checkpoint().format).toBe(2);
});
test('remaining service cannot overlap a future miner or reuse its identity',() => {
  const input = buildingInput(); input.project.spawning.requests = [{ id: 'future',name: 'future',owner: 'source',room: 'home',body: ['work','carry','move'],readyAt: 0,expiresAt: 100,priority: 1 }];
  input.project.workers = [{ request: 'future',travelTicks: 0,retireTicks: 0 }]; expect(() => forecastStartupProject(input)).toThrow('handoff');
  input.project.spawning.requests[0]!.id = 'paid-miner'; expect(() => createStartupProject(input)).toThrow('identity');
});
test('invalid life/cargo and an inconsistent opening benchmark fail before producing a forecast',() => {
  const input = buildingInput(); input.initial!.miner!.expiresAt = 1500; expect(() => createStartupProject(input)).toThrow('remaining life');
  input.initial!.miner!.expiresAt = 10; input.initial!.miner!.energy = 51; expect(() => createStartupProject(input)).toThrow('cargo');
  input.initial!.miner!.energy = 8; input.project.spawning.cash.openingAssets = 0; expect(() => createStartupProject(input)).toThrow('benchmark');
  expect(() => forecastStartupDelivery(buildingInput())).toThrow('forward');
});

test('a paid incubating worker waits for birth and arrival without another funding debit',() => {
  const input = buildingInput(); input.project.source.energy = 100; input.initial!.miner = { ...miner(),energy: 0,remainingSpawnTicks: 3,availableAt: 5,expiresAt: 1502 };
  const project = createStartupProject(input); project.advance(5); expect(project.checkpoint().construction.harvestedEnergy).toBe(0);
  const resumed = restoreStartupProject(input,JSON.parse(JSON.stringify(project.checkpoint()))); resumed.advance(16);
  expect(resumed.result().construction.completeAt).toBe(9); expect(resumed.result().spawning.births).toEqual([]); expect(resumed.result().cash.birthEnergy).toBe(0);
});
