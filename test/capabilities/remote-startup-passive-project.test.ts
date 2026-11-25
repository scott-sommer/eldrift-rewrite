import { expect, test } from 'vitest';
import { createStartupProject, restoreStartupProject, forecastStartupProject } from '../../src/capabilities/economy/startup/project';
import { startupPassiveProject } from '../fixtures/startup-passive-project';
import { startupStructureProject } from '../fixtures/startup-structure-project';
test('project5 carries ambient cash independently of source return through in-flight reset',() => {
  const input = startupPassiveProject(), expected = forecastStartupProject(input), baseline = forecastStartupProject(startupStructureProject());
  expect(expected.cash.ambientEnergy).toBe(100); expect(expected.delivery.deliveredEnergy).toBe(baseline.delivery.deliveredEnergy);
  expect(expected.cash.endingEnergy).toBe(baseline.cash.endingEnergy+100); expect(expected.projectCash.homeCashSurplus).toBe(baseline.projectCash.homeCashSurplus);
  expect(expected.projectCash.constructionRecoveryMargin).toBe(baseline.projectCash.constructionRecoveryMargin);
  const partial = createStartupProject(input); partial.advance(7); const wire = JSON.parse(JSON.stringify(partial.checkpoint()));
  expect(wire).toMatchObject({ format: 5,household: { format: 3 },timeline: { energy: { format: 2,ambientThrough: 6 },accounting: { state: { ambientEnergy: 7 } } } });
  const resumed = restoreStartupProject(input,wire); resumed.advance(94); expect(resumed.result()).toEqual(expected); expect(restoreStartupProject(input,resumed.checkpoint()).result()).toEqual(expected);
});
test('old project labels and mismatched source ambient counter are refused',() => {
  const input = startupPassiveProject(), project = createStartupProject(input); project.advance(20);
  const old = project.checkpoint(); old.format = 4; expect(() => restoreStartupProject(input,old)).toThrow('checkpoint');
  const forged = project.checkpoint(); forged.sourceAccounting.state.ambientEnergy!++; forged.sourceAccounting.state.endingEnergy++;
  expect(() => restoreStartupProject(input,forged)).toThrow('checkpoint');
});
test('passive input may collide with incoming space and leave paid cargo to expire, without counting gifts as return',() => {
  const input = startupPassiveProject(); input.project.workers = []; input.couriers = []; input.project.remainingProgress = 4;
  const spawning = input.project.spawning; spawning.requests = [{ id: 'home',name: 'home',owner: 'home',room: 'home',body: ['carry','carry','move'],priority: 0,readyAt: 0,expiresAt: 31 }];
  spawning.cash = { homeEnergy: 450,protectedEnergy: 0,horizon: 1510,readyAt: 0,selfHarvestedConstruction: 4,flows: [] };
  spawning.funding = { capacity: 300,initialEnergy: 150,refills: [],energyLayout: { structures: [{ id: 'spawn',kind: 'spawn',energy: 150,capacity: 300,reservedCapacity: 150 }],orders: [{ spawn: 'spawn',structures: ['spawn'] }],regeneration: { eligibleSpawns: ['spawn'],otherRoomEnergy: 0 } } };
  input.homeSink = { capacity: 300,freeCapacity: 0,changes: [] };
  input.household = { endpointEnergy: 300,redistribution: { horizon: 1510,trips: [9,14].map((pickupAt,index) => ({ id: 'trip'+index,request: 'home',destination: 'spawn',pickupAt,loadedTicks: 2,returnTicks: 1,energy: 100 })) } };
  const model = createStartupProject(input); model.advance(19); const resumed = restoreStartupProject(input,JSON.parse(JSON.stringify(model.checkpoint()))); resumed.advance(1492);
  expect(resumed.result()).toMatchObject({ cash: { ambientEnergy: 167,endingEnergy: 400,birthEnergy: 150,upkeepEnergy: 67,deliveredEnergy: 0,homeCashSurplus: -217 },projectCash: { ambientEnergy: 167,upkeepEnergy: 67,deliveredEnergy: 0,homeCashSurplus: -217 },spawning: { funding: { refilledEnergy: 133 },redistribution: { lost: 67,cargo: 0 } } });
  expect(restoreStartupProject(input,resumed.checkpoint()).result()).toEqual(resumed.result());
});
