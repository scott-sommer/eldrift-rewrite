import { expect, test } from 'vitest';
import { createActionArbiter } from '../../src/core/execution/action-arbiter';
import { createCreepActions } from '../../src/adapters/screeps/creep-actions';
test('economy adapter blocks suppressed work while preserving movement and upgrade intent channels', () => {
  const calls: string[] = [];
  const creep = { name: 'worker', harvest: () => { calls.push('harvest'); return 0; }, build: () => { calls.push('build'); return 0; }, move: () => { calls.push('move'); return 0; }, upgradeController: () => { calls.push('upgrade'); return 0; } } as unknown as Creep;
  const actions = createCreepActions(creep, 'worker-task', createActionArbiter(() => 1));
  expect(actions.harvest({} as Source).status).toBe('issued');
  expect(actions.build({} as ConstructionSite).status).toBe('blocked');
  expect(actions.move(1).status).toBe('issued');
  expect(actions.upgrade({} as StructureController).status).toBe('issued');
  expect(calls).toEqual(['harvest', 'move', 'upgrade']);
});

test('dismantle and other WORK actions share admission, without requiring carried energy', () => {
  const calls: string[] = [];
  const creep = { name: 'salvager', dismantle: () => { calls.push('dismantle'); return 0; },
    harvest: () => { calls.push('harvest'); return 0; }, repair: () => { calls.push('repair'); return 0; } } as unknown as Creep;
  const actions = createCreepActions(creep, 'bootstrap', createActionArbiter(() => 1));
  expect(actions.dismantle({} as Structure).status).toBe('issued');
  expect(actions.harvest({} as Source).status).toBe('blocked');
  expect(actions.repair({} as Structure).status).toBe('blocked');
  expect(calls).toEqual(['dismantle']);
});
