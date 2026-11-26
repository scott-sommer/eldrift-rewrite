import type { SpawnRequest } from '../../src/capabilities/spawning/request';
import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { reconcileWorkerPopulation } from '../../src/features/work/population';
import { workOwner, workModeFor, isWorkOwner } from '../../src/features/work/identity';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
const plan = { room: 'W0N0', level: 4, enabled: true, budget: 500, fallback: 'builder' as const,
  targets: { builder: 1, fortifier: 1, upgrader: 1 } };
function fixture() {
  const memory = {};
  const state = createMemoryPort(() => memory);
  return { state, queue: createSpawnQueue(state, plan.room) };
}
test('mixed worker demand owns distinct requests, preserves legacy workers and never duplicates pending demand', () => {
  const { state, queue } = fixture();
  const units = [{ name: 'legacy', owner: workOwner(plan.room), room: plan.room, spawning: false, ticksToLive: 1000 }];
  reconcileWorkerPopulation(state, plan, units, 1);
  expect(queue.list().map(request => request.owner).sort()).toEqual([workOwner(plan.room, 'fortifier'), workOwner(plan.room, 'upgrader')]);
  const before = queue.list();
  reconcileWorkerPopulation(state, plan, units, 2);
  expect(queue.list()).toEqual(before);
  expect(workModeFor(workOwner(plan.room, 'upgrader'), plan.room, 'builder')).toBe('upgrader');
  expect(isWorkOwner('work:W0N0:other', plan.room)).toBe(false);
  expect(isWorkOwner(workOwner('W1N1', 'builder'), plan.room)).toBe(false);
});
test('worker demand counts spawning identities, replaces expiring units and cancels only its own requests', () => {
  const { state, queue } = fixture();
  reconcileWorkerPopulation(state, plan, [], 1);
  const first = queue.list().find(request => request.owner === workOwner(plan.room, 'builder'))!;
  const unit = { name: first.name, owner: first.owner, room: plan.room, spawning: true, ticksToLive: 0 };
  reconcileWorkerPopulation(state, plan, [unit], 2);
  expect(queue.list().some(request => request.owner === first.owner)).toBe(false);
  reconcileWorkerPopulation(state, plan, [{ ...unit, spawning: false, ticksToLive: 10 }], 3);
  expect(queue.list().filter(request => request.owner === first.owner)).toHaveLength(1);
  queue.submit({ ...first, id: 'foreign', name: 'foreign', owner: 'mining:source' });
  reconcileWorkerPopulation(state, { ...plan, enabled: false }, [], 4);
  expect(queue.list().map(request => request.id)).toEqual(['foreign']);
});
test('unaffordable worker recipes do not submit demand and target reductions remove stale requests', () => {
  const { state, queue } = fixture();
  reconcileWorkerPopulation(state, { ...plan, budget: 249 }, [], 1);
  expect(queue.list()).toEqual([]);
  reconcileWorkerPopulation(state, plan, [], 2);
  reconcileWorkerPopulation(state, { ...plan, targets: { builder: 0, fortifier: 0, upgrader: 1 } }, [], 3);
  expect(queue.list().map(request => request.owner)).toEqual([workOwner(plan.room, 'upgrader')]);
});


test('guarded births cover demand and retain their separate cancellation owner across recipe or target changes',() => {
  const { state,queue } = fixture(), owner = workOwner(plan.room,'builder');
  const guarded = { id: 'guarded',name: 'guarded',owner,room: plan.room,body: ['work','carry','move'] as const,priority: 5,readyAt: 1,expiresAt: 20,admission: { kind: 'household-labor' as const,task: 'household-labor:guarded',publication: true as const } };
  queue.submit(guarded); const ordinary = { ...guarded,id: 'ordinary',name: 'ordinary',priority: 0 } as SpawnRequest; delete ordinary.admission; queue.submit(ordinary);
  const targets = { builder: 1,fortifier: 0,upgrader: 0 };
  reconcileWorkerPopulation(state,{ ...plan,targets },[],1); expect(queue.list()).toEqual([guarded]);
  reconcileWorkerPopulation(state,{ ...plan,targets,budget: 200 },[],2); expect(queue.list()).toEqual([guarded]);
  reconcileWorkerPopulation(state,{ ...plan,targets,enabled: false },[],3); expect(queue.list()).toEqual([guarded]);
  reconcileWorkerPopulation(state,{ ...plan,targets: { ...targets,builder: 0 } },[],4); expect(queue.list()).toEqual([guarded]);
});
