import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { cleanupStartupCohort } from '../../src/features/remotes/startup/candidates/cohort-cleanup';
import { createStartupCohortMaintenance } from '../../src/features/remotes/startup/candidates/cohort-maintenance';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import { createStartupPlanningJob } from '../../src/features/remotes/startup/planning/runner';
import { remoteFleetOwner } from '../../src/features/remotes/fleet/identity';
import { startupDeliveryInput } from '../fixtures/startup-delivery';
function fixture() {
  const root = {}, state = createMemoryPort(() => root), home = 'W0N1', input = startupDeliveryInput();
  input.project.spawning.room = home; input.project.spawning.cash.horizon = 1000; input.project.source.energy = 1000; input.project.source.capacity = 1000;
  input.project.spawning.spawns = input.project.spawning.spawns.map(spawn => ({ ...spawn,room: home }));
  input.project.spawning.requests = input.project.spawning.requests.map((request,index) => ({ ...request,room: home,owner: remoteFleetOwner({ home,room: 'E0N1',source: 'source',kind: index === 0 ? 'miner' : 'courier' }) }));
  const query = { room: 'E0N1',source: 'source',generation: 1,binding: 'context',observedAt: 1,expiresAt: 100,tick: 1,input };
  const requests = input.project.spawning.requests.map(request => ({ ...request,readyAt: 1,expiresAt: 101 }));
  const queue = createSpawnQueue(state,home), policy = { minimumRecoveryMargin: 0,minimumDeliveredEnergy: 1,maximumRecoveryTicks: 1000,maximumHouseholdCapital: 1000 };
  return { root,state,home,query,requests,queue,current: { query,policy,binding: query.binding,tick: 1 } };
}
test('exact scoped invalidation preserves occupied births, unrelated work and changed records, and is idempotent',() => {
  const f = fixture(); f.requests.forEach(request => f.queue.submit(request));
  f.queue.submit({ ...f.requests[1]!,id: 'unrelated',name: 'unrelated' });
  const result = cleanupStartupCohort(f.state,f.home,f.query,new Set(['miner']));
  expect(result).toEqual({ cancelled: ['courier'],occupied: ['miner'],conflicts: [] });
  expect(f.queue.list().map(request => request.id)).toEqual(['miner','unrelated']);
  const before = JSON.stringify(f.root); cleanupStartupCohort(f.state,f.home,f.query,new Set(['miner'])); expect(JSON.stringify(f.root)).toBe(before);
});
test('same identifier with changed body remains a conflict and absent queues are not initialized',() => {
  const f = fixture(); expect(cleanupStartupCohort(f.state,f.home,f.query,new Set()).cancelled).toEqual([]); expect(f.root).toEqual({});
  f.queue.submit({ ...f.requests[1]!,body: ['move'] });
  expect(cleanupStartupCohort(f.state,f.home,f.query,new Set()).conflicts).toEqual(['courier']); expect(f.queue.list()).toHaveLength(1);
});
test('current completed evidence is read-only; changed context invalidates only unstarted participants',() => {
  const f = fixture(); createStartupPlanningJob(f.state,f.home).advance({ ...f.query,expectedRevision: 0 },1001); f.requests.forEach(request => f.queue.submit(request));
  const maintain = createStartupCohortMaintenance(f.state,f.home), before = JSON.stringify(f.root);
  expect(maintain(f.current,new Set())).toEqual({ status: 'current' }); expect(JSON.stringify(f.root)).toBe(before);
  expect(maintain({ ...f.current,binding: 'changed' },new Set(['miner']))).toEqual({ status: 'invalid',reason: 'binding',cancelled: ['courier'],occupied: ['miner'],conflicts: [] });
});

test('restored binding cannot revive a missed cohort and cleanup preserves the occupied paid participant',() => {
  const f = fixture(); createStartupPlanningJob(f.state,f.home).advance({ ...f.query,expectedRevision: 0 },1001); f.requests.forEach(request => f.queue.submit(request));
  const query = { ...f.query,tick: 11 }, birth = { request: 'miner',owner: f.requests[0]!.owner,home: f.home,body: f.requests[0]!.body,startAt: 1,activeAt: 10 };
  expect(createStartupCohortMaintenance(f.state,f.home)({ ...f.current,query,tick: 11,births: [birth] },new Set(['miner']))).toEqual({ status: 'invalid',reason: 'cohort-progress',cancelled: ['courier'],occupied: ['miner'],conflicts: [] });
});
