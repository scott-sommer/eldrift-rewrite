import { expect, test } from 'vitest';
import { createStartupProject, forecastStartupProject, restoreStartupProject } from '../../src/capabilities/economy/startup/project';
import { startupLaborProject } from '../fixtures/startup-labor-project';
test.each([['upgrade',2],['build',10]] as const)('project %s consumes paid cargo without adding income or releasing sink space twice', (kind,spent) => {
  const input = startupLaborProject(kind), baseline = startupLaborProject(kind); baseline.household!.labor!.jobs = [];
  const result = forecastStartupProject(input), previous = forecastStartupProject(baseline);
  expect(result.spawning.births).toEqual(previous.spawning.births); expect(result.delivery).toEqual(previous.delivery);
  expect(result.cash.endingEnergy).toBe(previous.cash.endingEnergy-spent); expect(result.projectCash.constructionRecoveryMargin).toBe(previous.projectCash.constructionRecoveryMargin-spent);
  expect(result.homeSink.remainingCapacity).toBe(previous.homeSink.remainingCapacity+spent);
  let model = createStartupProject(input);
  for (let tick = 0; tick <= 100; tick++) { model.advance(1); const saved = JSON.parse(JSON.stringify(model.checkpoint())); expect(saved).toMatchObject({ format: 7,household: { format: 5,labor: { format: 1 } } }); model = restoreStartupProject(input,saved); }
  expect(model.result()).toEqual(result);
});
test('project restore rejects forged sink releases and wrong accepting-endpoint capacity',() => {
  const input = startupLaborProject(), model = createStartupProject(input); model.advance(16); const saved = model.checkpoint();
  saved.sink.free++; expect(() => restoreStartupProject(input,saved)).toThrow();
  input.household!.endpointCapacity = input.homeSink.capacity-1; expect(() => createStartupProject(input)).toThrow('capacity mismatch');
});
