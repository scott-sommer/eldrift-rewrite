import { afterEach, expect, test, vi } from 'vitest';
import { createNativePlanningScore } from '../../src/app/native-planning-score';
import { planningObservation } from '../fixtures/planning-observation';
afterEach(() => vi.unstubAllGlobals());
function setup() {
  vi.stubGlobal('CONTROLLER_STRUCTURES', { spawn: { 1: 1, 8: 3 }, extension: { 8: 60 }, road: { 8: 2500 } });
  vi.stubGlobal('CONSTRUCTION_COST', { spawn: 15000, extension: 3000, road: 300 });
  vi.stubGlobal('OBSTACLE_OBJECT_TYPES', ['spawn', 'extension']);
  return { maximumPathOps: 10000, protectedTypes: ['spawn'], barrierCosts: { rampart: 1, constructedWall: 1 } };
}
const candidate = { id: 'standard:20:20:0', strategy: 'standard', anchor: { x: 20, y: 20 }, transform: 0 as const };
test('native defaults use RCL8 capacity, nominal native costs and legacy service weights', () => {
  const score = createNativePlanningScore('W0N1', setup());
  const observation = planningObservation(), prepare = score.prepare(observation);
  const result = prepare(candidate, []);
  expect(result.storage).toEqual({ x: 20, y: 20 });
  expect(result.desiredCapacity).toEqual({ spawn: 3, extension: 60 });
  expect(result.serviceWeights).toEqual({ spawn: 8, extension: 1 });
  expect(result.constructionCost.spawn).toBe(15000);
  expect(result.retirementCost.extension).toBe(3000);
  expect(result.hauling).toEqual(observation.objects.map(object => ({ id: object.id, position: object.position, weight: 1 })));
  expect(result.blocksMovement('spawn')).toBe(true);
  expect(result.blocksMovement('road')).toBe(false);
  observation.objects[0]!.position.x = 0;
  result.storage.x = 0;
  expect(prepare(candidate, []).storage.x).toBe(20);
  expect(prepare(candidate, []).hauling[0]!.position.x).not.toBe(0);
});
test('explicit score policies bind stable identities and zero demand removes unnecessary routes', () => {
  const options = { ...setup(), haulingWeights: { source: 2, controller: 0, mineral: 0 },
    serviceWeights: { spawn: 8, extension: 1 } };
  const first = createNativePlanningScore('W0N1', options);
  const reordered = createNativePlanningScore('W0N1', { ...options, serviceWeights: { extension: 1, spawn: 8 } });
  expect(reordered.revision).toBe(first.revision);
  const input = first.prepare(planningObservation())(candidate, []);
  expect(input.hauling.every(target => target.weight === 2)).toBe(true);
  expect(input.hauling).toHaveLength(2);
  expect(createNativePlanningScore('W0N1', { ...options, serviceWeights: { spawn: 4 } }).revision).not.toBe(first.revision);
  options.serviceWeights.spawn = 1;
  expect(first.prepare(planningObservation())(candidate, []).serviceWeights.spawn).toBe(8);
});
test('invalid budgets, fractional capacity and invalid weights reject preparation', () => {
  const options = setup();
  expect(() => createNativePlanningScore('W0N1', { ...options, maximumPathOps: 0 })).toThrow('search');
  expect(() => createNativePlanningScore('W0N1', { ...options, desiredCapacity: { spawn: 0.5 } })).toThrow('weights');
  expect(() => createNativePlanningScore('W0N1', { ...options, serviceWeights: { spawn: -1 } })).toThrow('weights');
});
