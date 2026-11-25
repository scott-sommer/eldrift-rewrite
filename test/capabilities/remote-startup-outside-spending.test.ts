import { expect, test } from 'vitest';
import { createStartupProject, forecastStartupProject, restoreStartupProject } from '../../src/capabilities/economy/startup/project';
import { startupOutsideProject } from '../fixtures/startup-outside-project';
import { startupPassiveProject } from '../fixtures/startup-passive-project';
test('outside spending reduces endpoint/bank and source profit without consuming spawn stock or gift eligibility',() => {
  const input = startupOutsideProject(), expected = forecastStartupProject(input), baseline = forecastStartupProject(startupPassiveProject());
  expect(expected.spawning.births).toEqual(baseline.spawning.births); expect(expected.cash.ambientEnergy).toBe(baseline.cash.ambientEnergy);
  expect(expected.cash.endingEnergy).toBe(baseline.cash.endingEnergy-4); expect(expected.projectCash.constructionRecoveryMargin).toBe(baseline.projectCash.constructionRecoveryMargin-4);
  expect(expected.homeSink.remainingCapacity).toBe(baseline.homeSink.remainingCapacity+4);
  const model = createStartupProject(input); model.advance(21); const saved = JSON.parse(JSON.stringify(model.checkpoint()));
  expect(saved).toMatchObject({ format: 6,household: { format: 4,endpointSpentEnergy: 1 } });
  const resumed = restoreStartupProject(input,saved); resumed.advance(80); expect(resumed.result()).toEqual(expected);
  saved.household.endpointSpentEnergy = 0; saved.household.endpointEnergy++; expect(() => restoreStartupProject(input,saved)).toThrow();
});
test('endpoint expenses precede pickup, so the same stock cannot pay a bill and load a courier',() => {
  const input = startupOutsideProject(); input.project.spawning.cash.homeEnergy = 350; input.household!.endpointEnergy = 50;
  input.project.spawning.cash.flows = [{ id: 'endpoint-bill',kind: 'upkeep',spending: 'outside-spawn',energy: 50,firstTick: 6,interval: null,occurrences: 1 }];
  const model = createStartupProject(input); model.advance(7); const saved = model.checkpoint();
  expect(saved.household).toMatchObject({ endpointEnergy: 0,endpointSpentEnergy: 50 });
  expect(saved.household!.redistribution.trips[0]).toMatchObject({ phase: 'missed',picked: 0 });
  expect(saved.sink.free).toBe(80); expect(saved.timeline.accounting.state.upkeepEnergy).toBe(50);
  expect(restoreStartupProject(input,saved).checkpoint()).toEqual(saved);
});
test('expenses cannot borrow future receipts or point stock, and incomplete physical location metadata refuses',() => {
  const input = startupOutsideProject(); input.project.spawning.cash.homeEnergy = 300; input.household!.endpointEnergy = 0;
  input.project.spawning.cash.flows = [{ id: 'unfunded',kind: 'upkeep',spending: 'outside-spawn',energy: 1,firstTick: 0,interval: null,occurrences: 1 }];
  const model = createStartupProject(input), before = model.checkpoint(); expect(() => model.advance(1)).toThrow('endpoint'); expect(model.checkpoint()).toEqual(before);
  const old = startupOutsideProject(); delete old.project.spawning.funding.energyLayout!.regeneration; expect(() => createStartupProject(old)).toThrow('passive');
  const wrong = startupOutsideProject(); wrong.project.spawning.cash.flows = [{ ...wrong.project.spawning.cash.flows[0]!,kind: 'delivery' }]; expect(() => createStartupProject(wrong)).toThrow('location');
});
