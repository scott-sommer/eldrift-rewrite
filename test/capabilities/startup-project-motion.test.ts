import { expect,test } from 'vitest';
import { startupMotionInput as input } from '../fixtures/startup-motion';
import { createStartupProject,forecastStartupProject,restoreStartupProject } from '../../src/capabilities/economy/startup/project';
const json = <T>(value: T): T => JSON.parse(JSON.stringify(value));
test('physical trips are owned by format9 and JSON resume matches uninterrupted project cash and receipts',() => {
  const value = input(),expected = forecastStartupProject(value);
  expect(expected.delivery.deliveredEnergy).toBeGreaterThan(0);
  for (let through = 0; through <= 71; through++) {
    const project = createStartupProject(value); project.advance(through);
    const saved = json(project.checkpoint()); expect(saved.format).toBe(9); expect(saved.motion).toBeDefined();
    const restored = restoreStartupProject(value,saved); restored.advance(100);
    expect(restored.result()).toEqual(expected);
  }
});
test('shared scheduled blockage changes physical receipts and source cash coherently',() => {
  const ordinary = forecastStartupProject(input()),blocked = forecastStartupProject(input(true));
  expect(blocked.delivery.firstDeliveryAt).toBeGreaterThan(ordinary.delivery.firstDeliveryAt!);
  expect(blocked.cash.deliveredEnergy).toBe(blocked.delivery.deliveredEnergy);
  expect(blocked.projectCash.deliveredEnergy).toBe(blocked.delivery.deliveredEnergy);
});
test('routes, body and checkpoint payload cannot be silently changed or downgraded',() => {
  const value = input(),project = createStartupProject(value); project.advance(30); const saved = json(project.checkpoint());
  const altered = input(); altered.motion!.routes[0]!.loaded.priority++;
  expect(() => restoreStartupProject(altered,saved)).toThrow('checkpoint');
  expect(() => restoreStartupProject(value,{ ...saved,format: 8 })).toThrow('checkpoint');
  expect(() => restoreStartupProject(value,{ ...saved,motion: undefined })).toThrow();
  const missing = json(saved); missing.motion!.trips = []; expect(() => restoreStartupProject(value,missing)).toThrow('checkpoint');
  const body = input(); body.motion!.routes[0]!.loaded.recovery = 4; expect(() => createStartupProject(body)).toThrow('body/owner');
});

test('trip activation follows actual project birth clocks',() => {
  const value = input(),project = createStartupProject(value);
  while (!project.birth('courier') && project.checkpoint().tick < 70) project.advance(1);
  const birth = project.birth('courier')!; expect(birth).toBeDefined();
  project.advance(birth.activeAt-project.checkpoint().tick); expect(project.checkpoint().motion!.trips).toEqual([]);
  project.advance(1); const trip = project.checkpoint().motion!.trips[0]!;
  expect(trip.transit.readyAt).toBe(birth.activeAt);
  expect(trip.transit.lastAt).toBe(birth.activeAt);
  expect(trip.transit.index).toBe(1);
});

test('physical checkpoints do not impose obsolete scalar approach arrival floors',() => {
  const value = input(); value.couriers[0]!.initialOutboundTicks = 100;
  const project = createStartupProject(value); project.advance(45);
  const restored = restoreStartupProject(value,json(project.checkpoint())); restored.advance(100);
  expect(restored.result()).toEqual(forecastStartupProject(value));
});
