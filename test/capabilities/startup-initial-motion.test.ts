import { expect,test } from 'vitest';
import { startupInitialMotionInput } from '../fixtures/startup-initial-motion';
import { createStartupProject,forecastStartupProject,restoreStartupProject } from '../../src/capabilities/economy/startup/project';
const json = <T>(value: T): T => JSON.parse(JSON.stringify(value));
test('loaded incumbent follows actual opening path and fatigue without any replacement birth',() => {
  const result = forecastStartupProject(startupInitialMotionInput());
  expect(result.spawning.births).toEqual([]); expect(result.cash.birthEnergy).toBe(0);
  expect(result.delivery.firstDeliveryAt).toBe(7); expect(result.delivery.deliveredEnergy).toBe(32);
  expect(forecastStartupProject(startupInitialMotionInput(0)).delivery.firstDeliveryAt).toBe(5);
});
test('format10 resumes exactly at every opening movement and service frame',() => {
  const input = startupInitialMotionInput(),expected = forecastStartupProject(input);
  for (let through = 0; through <= 31; through++) {
    const project = createStartupProject(input); project.advance(through); const saved = json(project.checkpoint());
    expect(saved.format).toBe(10); expect(saved.timeline.births).toEqual([]);
    const restored = restoreStartupProject(input,saved); restored.advance(100); expect(restored.result()).toEqual(expected);
  }
});
test('missing opening identity/history and downgrade cannot silently treat paid bodies as newborn',() => {
  const input = startupInitialMotionInput(),project = createStartupProject(input); project.advance(3); const saved = json(project.checkpoint());
  expect(() => restoreStartupProject(input,{ ...saved,format: 9 })).toThrow('checkpoint');
  const missing = startupInitialMotionInput(); delete missing.motion!.openings; expect(() => createStartupProject(missing)).toThrow('opening roster');
  const lost = json(saved); lost.motion!.trips = []; expect(() => restoreStartupProject(input,lost)).toThrow('checkpoint');
  const foreign = startupInitialMotionInput(); foreign.motion!.openings![0]!.owner = 'foreign'; expect(() => createStartupProject(foreign)).toThrow();
});
test('physical return-only retirement remains explicit rather than inventing another empty trip',() => {
  const input = startupInitialMotionInput(); input.initial!.couriers[0]!.mode = 'return-only';
  expect(() => createStartupProject(input)).toThrow('retirement motion');
});

test('opening readiness and progress cannot be forged across a saved checkpoint',() => {
  const input = startupInitialMotionInput(),project = createStartupProject(input); project.advance(2); const saved = json(project.checkpoint());
  const early = json(saved); early.motion!.trips[0]!.transit.readyAt = 1;
  expect(() => restoreStartupProject(input,early)).toThrow('opening state');
  const jumped = json(saved); jumped.motion!.trips[0]!.transit.index = 1; jumped.motion!.trips[0]!.transit.position.x = 13;
  expect(() => restoreStartupProject(input,jumped)).toThrow('opening progress');
});
test('a fatigued courier already at deposit can transfer without a movement delay',() => {
  const input = startupInitialMotionInput(),opening = input.motion!.openings![0]!;
  opening.plan = { ...opening.plan,origin: { ...input.motion!.routes[0]!.empty.origin },path: [] };
  expect(forecastStartupProject(input).delivery.firstDeliveryAt).toBe(1);
});

test('already-paid incubation joins at remaining spawn time without a new scheduled birth',() => {
  const input = startupInitialMotionInput(0),worker = input.initial!.couriers[0]!,opening = input.motion!.openings![0]!;
  worker.energy = 0; worker.phase = 'collect'; worker.remainingSpawnTicks = 2; worker.availableAt = 2; worker.expiresAt = 1501;
  input.initial!.containerEnergy = 32; opening.readyAt = 2; opening.plan = { ...opening.plan,path: opening.plan.path.slice(0,2) };
  const project = createStartupProject(input); project.advance(2);
  expect(project.checkpoint().motion!.trips).toEqual([]); expect(project.checkpoint().timeline.births).toEqual([]);
  const restored = restoreStartupProject(input,json(project.checkpoint())); restored.advance(100);
  expect(restored.result().delivery.firstDeliveryAt).toBe(8); expect(restored.result().delivery.deliveredEnergy).toBe(32);
});
