import { afterEach, expect, test, vi } from 'vitest';
import { createNativePlanningCommitValidator } from '../../src/app/native-planning-commit-validation';
import type { NativeCommitPolicy } from '../../src/app/native-planning-commit-validation';
import { observeRoomPlanningInput } from '../../src/adapters/screeps/room-assessment';
import { prepareConfiguredPlanningRequest } from '../../src/features/planning/configured-planning-request';
import { identifyPlanningRequest } from '../../src/features/planning/planning-identity';
import { resolveConfig } from '../../src/config/resolve';
import { planningLimits } from '../fixtures/planning-limits';
import type { PlanState } from '../../src/features/planning/plan-model';
afterEach(() => vi.unstubAllGlobals());
function setup() {
  const terrain = { obstructed: false };
  const room = { controller: { id: 'controller', my: true, pos: { x: 40, y: 40 } },
    getTerrain: () => ({ get: (x: number, y: number) => terrain.obstructed && x === 24 && y === 25 ? 1 : 0 }),
    find: () => [] };
  const rooms: Record<string, typeof room> = { W0N1: room };
  for (const [key, value] of Object.entries({ Game: { rooms }, FIND_SOURCES: 1, FIND_MINERALS: 2,
    FIND_STRUCTURES: 3, FIND_CONSTRUCTION_SITES: 4, TERRAIN_MASK_WALL: 1, TERRAIN_MASK_SWAMP: 2,
    OBSTACLE_OBJECT_TYPES: ['spawn', 'storage'], CONTROLLER_STRUCTURES: { ...planningLimits, rampart: Array(9).fill(2500) } })) {
    vi.stubGlobal(key, value);
  }
  const policy: NativeCommitPolicy = { config: resolveConfig({ empire: { planningEnabled: true } }, 1).values,
    currentPlan: { room: 'W0N1', revision: 0, strategy: null, entries: [] }, valuableTypes: ['storage'],
    implementationRevision: 'v1', constraints: [], protectedTypes: ['storage'], barrierCosts: { rampart: 1, constructedWall: 1 } };
  const request = prepareConfiguredPlanningRequest(observeRoomPlanningInput('W0N1')!, policy.currentPlan, policy.config, policy.valuableTypes);
  if (!request.ok) throw new Error(request.reason);
  const identity = identifyPlanningRequest(request, policy.implementationRevision, 'W0N1');
  const plan: PlanState = { room: 'W0N1', revision: 1, strategy: 'standard', entries: [
    { type: 'spawn', x: 24, y: 25, rcl: 1, priority: -430, source: 'strategy' },
    { type: 'storage', x: 25, y: 25, rcl: 4, priority: -500, source: 'strategy' },
    { type: 'rampart', x: 25, y: 25, rcl: 4, priority: -100, source: 'strategy' }],
    provenance: { candidateId: 'standard:25:25:0', strategyVersion: 'v1', observation: identity.observationIdentity,
      policy: identity.policyIdentity, generatedAt: 1, committedAt: 2, anchor: { x: 25, y: 25 }, transform: 0,
      bootstrap: { spawn: 'spawn:24:25', storage: 'storage:25:25' },
      costs: { hauling: 0, service: 0, capacityShortfall: 0, swamps: 0, defense: 1, migration: 3 } } };
  const read = vi.fn(() => policy);
  return { policy, plan, rooms, room, terrain, read, validate: createNativePlanningCommitValidator('W0N1', read) };
}
test('native callback accepts matching current observations then rejects a new obstruction', () => {
  const { validate, plan, terrain } = setup();
  expect(validate(plan)).toBe(true);
  terrain.obstructed = true;
  expect(validate(plan)).toBe(false);
});
test('policy is reread and changed refresh or manual constraints reject an old proposal', () => {
  const { validate, plan, policy, read } = setup();
  expect(validate(plan)).toBe(true);
  policy.config = { ...policy.config, planningRefreshRevision: 1 };
  expect(validate(plan)).toBe(false);
  policy.config = { ...policy.config, planningRefreshRevision: 0 };
  policy.constraints = [{ id: 'new', kind: 'keep-clear', position: { x: 25, y: 25 } }];
  expect(validate(plan)).toBe(false);
  expect(read).toHaveBeenCalledTimes(3);
});
test('ownership, visibility and activation are rechecked at commit time', () => {
  const { validate, plan, policy, room, rooms } = setup();
  expect(validate(plan)).toBe(true);
  policy.config = { ...policy.config, planningEnabled: false };
  expect(validate(plan)).toBe(false);
  policy.config = { ...policy.config, planningEnabled: true };
  room.controller.my = false; expect(validate(plan)).toBe(false);
  room.controller.my = true; delete rooms.W0N1; expect(validate(plan)).toBe(false);
});
