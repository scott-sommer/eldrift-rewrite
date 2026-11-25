import { createQuantityReservations } from '../../src/persistence/quantities/store';
import { taskScope } from '../../src/persistence/tasks/scope';
import { expect, test } from 'vitest';
import { laborProposalFixture } from '../fixtures/household-labor-proposal';
import { readLaborProposalSnapshot } from '../../src/capabilities/economy/startup/household/labor/proposal-reader';
import { createLaborTaskStaging } from '../../src/features/work/stage-labor-task';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
function snapshot() { const f = laborProposalFixture(), ready = f.propose(f.input); if (ready.status !== 'ready') throw new Error('Expected proposal'); return ready.read(); }
test('recorded proposal reconstructs routes/work after JSON persistence without granting freshness',() => {
  const saved = snapshot(), wire = JSON.parse(JSON.stringify(saved)), rebuilt = readLaborProposalSnapshot(wire);
  expect(rebuilt).toEqual(saved); rebuilt.job.energy = 99; expect(wire.job.energy).toBe(3);
  for (const alter of [(s: typeof saved) => { s.job.energy++; },(s: typeof saved) => { s.route.legs[1]!.ticks++; },(s: typeof saved) => { s.facts.source.availableEnergy--; },(s: typeof saved) => { s.facts.target.id = 'other'; }]) {
    const bad = JSON.parse(JSON.stringify(saved)); alter(bad); expect(() => readLaborProposalSnapshot(bad)).toThrow();
  }
});
test('staged obligation survives reset with detached read and does not overwrite unrelated tasks',() => {
  const root = {}, state = createMemoryPort(() => root), owner = createLaborTaskStaging(state), saved = snapshot();
  expect(owner.stage(saved,1,() => true)).toBe('staged'); expect(owner.stage(saved,1,() => true)).toBe('existing');
  const restoredRoot = JSON.parse(JSON.stringify(root)), restored = createLaborTaskStaging(createMemoryPort(() => restoredRoot)), before = JSON.stringify(restoredRoot);
  expect(restored.read('worker')?.queue[0]).toMatchObject({ kind: 'household-labor',phase: 'await-birth',wakeAt: 10,expiresAt: 26 });
  restored.read('worker')!.queue[0]!.phase = 'changed'; expect(JSON.stringify(restoredRoot)).toBe(before);
  const changed = snapshot(); changed.input.order.score++;
  expect(owner.stage(changed,1,() => true)).toBe('task-conflict');
});
test('stale admission publishes nothing and foreign/corrupt task envelopes remain unchanged',() => {
  const root = {}, state = createMemoryPort(() => root), owner = createLaborTaskStaging(state), saved = snapshot();
  expect(owner.stage(saved,2,() => true)).toBe('stale'); expect(owner.stage(saved,1,() => false)).toBe('stale'); expect(root).toEqual({});
  state.write('tasks/worker',{ owner: 'other',version: 2,data: { unit: 'worker',queue: [] } }); const before = JSON.stringify(root);
  expect(() => owner.stage(saved,1,() => true)).toThrow('owner'); expect(JSON.stringify(root)).toBe(before);
});

test('cancellation releases only this obligation scope and preserves other task owners and claims',() => {
  const root = {},state = createMemoryPort(() => root), owner = createLaborTaskStaging(state), saved = snapshot();
  owner.stage(saved,1,() => true);
  const claims = createQuantityReservations(state), scope = taskScope('worker','household-labor:worker');
  const claim = { id: 'stock',owner: 'work',holder: 'worker',scope,expiresAt: 26,allocations: [{ pool: 'stock',amount: 3 }] };
  expect(claims.reserve(claim,{ stock: 10 },1)).toBe(true);
  expect(claims.reserve({ ...claim,id: 'other',scope: 'other-task' },{ stock: 10 },1)).toBe(true);
  const before = JSON.stringify(root); expect(owner.cancel('worker','other-request')).toBe(false); expect(JSON.stringify(root)).toBe(before);
  expect(owner.cancel('worker','worker')).toBe(true); expect(owner.read('worker')?.queue).toEqual([]);
  expect(claims.list(1).map(item => item.id)).toEqual(['other']); expect(owner.cancel('worker','worker')).toBe(false);
});

test('persisted task identity and timing must stay linked to the recorded worker obligation',() => {
  for (const field of ['wakeAt','expiresAt','id'] as const) {
    const root = {},state = createMemoryPort(() => root), owner = createLaborTaskStaging(state); owner.stage(snapshot(),1,() => true);
    const raw = state.read('tasks/worker') as { owner: string; version: number; data: { queue: { id: string; wakeAt: number; expiresAt: number }[] } };
    const task = raw.data.queue[0]!; if (field === 'id') task.id += 'other'; else task[field]++;
    state.write('tasks/worker',raw); const before = JSON.stringify(root);
    expect(() => owner.read('worker')).toThrow('mismatch'); expect(JSON.stringify(root)).toBe(before);
  }
});
