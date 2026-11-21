import { expect, test } from 'vitest';
import { createStartupProject, forecastStartupProject, restoreStartupProject } from '../../src/capabilities/economy/startup/project';
import { forecastStartupDelivery } from '../../src/capabilities/economy/startup/delivery';
import { startupHouseholdProject } from '../fixtures/startup-household-project';
import { startupDeliveryInput } from '../fixtures/startup-delivery';
test('physical household work funds remote birth and frees a finite accepting sink without extra income',() => {
  const input = startupHouseholdProject(), result = forecastStartupProject(input);
  expect(result.spawning.births.map(birth => [birth.request,birth.startAt])).toEqual([['household',0],['miner',6],['courier',15]]);
  const pending = createStartupProject(input); pending.advance(13);
  expect(pending.checkpoint().timeline.funding.accessible).toBe(100); expect(pending.checkpoint().timeline.births).toHaveLength(2);
  pending.advance(3); expect(pending.checkpoint().timeline.births.at(-1)?.startAt).toBe(15);
  expect(result.cash.birthEnergy).toBe(400); expect(result.delivery.deliveredEnergy).toBeGreaterThan(30);
  expect(result.cash.deliveredEnergy).toBe(result.delivery.deliveredEnergy); expect(result.projectCash.deliveredEnergy).toBe(result.delivery.deliveredEnergy);
  expect(result.homeSink.remainingCapacity).toBe(30+300-result.delivery.deliveredEnergy);
  expect(result.cash.endingEnergy).toBe(1000-400+result.delivery.deliveredEnergy);
});
test('format3 cargo/sink/cash state resumes identically and keeps old ordinary format2 behavior',() => {
  const input = startupHouseholdProject(), expected = forecastStartupProject(input), partial = createStartupProject(input); partial.advance(7);
  const checkpoint = JSON.parse(JSON.stringify(partial.checkpoint())); expect(checkpoint.format).toBe(3); expect(checkpoint.household.redistribution.trips[0].cargo).toBe(50); expect(checkpoint.sink.free).toBe(80);
  const resumed = restoreStartupProject(input,checkpoint); expect(resumed.advance(0)).toMatchObject({ through: 7,frames: 0 }); resumed.advance(94); expect(resumed.result()).toEqual(expected);
  expect(createStartupProject(startupDeliveryInput()).checkpoint().format).toBe(2);
});
test('snapshot and exact input binding prevent later household policy mutation affecting saved progress',() => {
  const input = startupHouseholdProject(), expected = forecastStartupProject(input), project = createStartupProject(input); project.advance(7); const saved = project.checkpoint();
  input.household!.redistribution.trips = [];
  expect(() => restoreStartupProject(input,saved)).toThrow('checkpoint'); project.advance(94); expect(project.result()).toEqual(expected);
});
test('forged sink releases, receipt stock and old-format relabeling fail closed',() => {
  const input = startupHouseholdProject(), project = createStartupProject(input); project.advance(7);
  const saved = project.checkpoint(), free = JSON.parse(JSON.stringify(saved)); free.sink.free++;
  expect(() => restoreStartupProject(input,free)).toThrow('checkpoint');
  const old = JSON.parse(JSON.stringify(saved)); old.format = 2; expect(() => restoreStartupProject(input,old)).toThrow('checkpoint');
  const ordinary = createStartupProject(startupDeliveryInput()).checkpoint(); expect(() => restoreStartupProject(input,ordinary)).toThrow('checkpoint');
});
test('one body cannot perform household transport and remote source work, and static projection refuses the new strategy',() => {
  const input = startupHouseholdProject(); input.household!.redistribution.trips = [{ ...input.household!.redistribution.trips[0]!,request: 'courier' }];
  expect(() => createStartupProject(input)).toThrow('share a body'); expect(() => forecastStartupDelivery(startupHouseholdProject())).toThrow('forward');
});
test('loaded expiry enters both project ledgers once and does not undo already earned receipts',() => {
  const input = startupHouseholdProject(); input.project.workers = []; input.couriers = []; input.project.remainingProgress = 4;
  input.project.spawning.requests = [{ id: 'home',name: 'home',owner: 'home',room: 'home',body: ['carry','carry','move'],priority: 0,readyAt: 0,expiresAt: 31 }];
  input.project.spawning.funding = { capacity: 150,initialEnergy: 150,refills: [] };
  input.project.spawning.cash = { homeEnergy: 450,protectedEnergy: 0,horizon: 1510,readyAt: 0,selfHarvestedConstruction: 4,flows: [] };
  input.homeSink = { capacity: 300,freeCapacity: 0,changes: [] };
  input.household = { endpointEnergy: 300,redistribution: { horizon: 1510,trips: [9,14].map((pickupAt,index) => ({ id: 'trip'+index,request: 'home',pickupAt,loadedTicks: 2,returnTicks: 1,energy: 100 })) } };
  const project = createStartupProject(input); project.advance(19); const resumed = restoreStartupProject(input,JSON.parse(JSON.stringify(project.checkpoint()))); resumed.advance(1492);
  expect(resumed.result()).toMatchObject({ cash: { birthEnergy: 150,upkeepEnergy: 50,deliveredEnergy: 0,endingEnergy: 250 },projectCash: { upkeepEnergy: 50,endingEnergy: 250 },homeSink: { remainingCapacity: 200 } });
  expect(restoreStartupProject(input,resumed.checkpoint()).result()).toEqual(resumed.result());
});
