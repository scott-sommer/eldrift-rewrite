import { expect, test } from 'vitest';
import { createStartupProject, restoreStartupProject, forecastStartupProject } from '../../src/capabilities/economy/startup/project';
import { startupStructureProject } from '../fixtures/startup-structure-project';
import { startupDeliveryInput } from '../fixtures/startup-delivery';
test('format4 links physical household delivery, birth, source return and sink accounting through reset',() => {
  const input = startupStructureProject(), expected = forecastStartupProject(input), project = createStartupProject(input); project.advance(7);
  const saved = JSON.parse(JSON.stringify(project.checkpoint()));
  expect(saved).toMatchObject({ format: 4,household: { format: 2 },timeline: { energy: { format: 1 } } });
  expect(saved.household.redistribution.trips[0].cargo).toBe(50);
  const resumed = restoreStartupProject(input,saved); expect(resumed.advance(0)).toMatchObject({ through: 7,frames: 0 }); resumed.advance(94);
  expect(resumed.result()).toEqual(expected); expect(expected.cash.deliveredEnergy).toBeGreaterThan(30);
  expect(expected.cash.deliveredEnergy).toBe(expected.delivery.deliveredEnergy); expect(expected.projectCash.deliveredEnergy).toBe(expected.delivery.deliveredEnergy);
  expect(expected.homeSink.remainingCapacity).toBe(330-expected.delivery.deliveredEnergy);
  expect(restoreStartupProject(input,resumed.checkpoint()).result()).toEqual(expected);
});
test('format4 cannot be downgraded or carry forged physical histories',() => {
  const input = startupStructureProject(), project = createStartupProject(input); project.advance(20);
  for (const format of [1,2,3]) { const saved = project.checkpoint(); saved.format = format as 2; expect(() => restoreStartupProject(input,saved)).toThrow('checkpoint'); }
  const changed = project.checkpoint(); changed.timeline.energy!.events[0]!.holder = 'forged'; expect(() => restoreStartupProject(input,changed)).toThrow('checkpoint');
});
test('ordinary point-aware projects validate energy on restore without requiring household metadata',() => {
  const input = startupDeliveryInput(); input.project.spawning.funding.energyLayout = {
    structures: [{ id: 'spawn',kind: 'spawn',energy: 300,capacity: 300 }],orders: [{ spawn: 'spawn',structures: ['spawn'] }],
  };
  const project = createStartupProject(input); project.advance(20); const wire = project.checkpoint(); expect(wire.format).toBe(4); expect(wire.household).toBeUndefined();
  const restored = restoreStartupProject(input,wire); restored.advance(81); expect(restored.result()).toEqual(forecastStartupProject(input));
  wire.timeline.energy!.points[0]!.energy++; expect(() => restoreStartupProject(input,wire)).toThrow('conservation');
});
