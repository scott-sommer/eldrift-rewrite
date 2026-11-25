import { expect, test } from 'vitest';
import { createLaborTaskBehavior } from '../../src/app/labor-task';
import { createTaskRunner } from '../../src/app/task-runner';
import { createLaborTaskStaging } from '../../src/features/work/stage-labor-task';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { laborProposalFixture } from '../fixtures/household-labor-proposal';
import type { LaborActor, LaborTaskPorts } from '../../src/app/labor-task-model';
import type { LaborProgress } from '../../src/features/work/labor-progress';
function fixture() {
  const f = laborProposalFixture(), ready = f.propose(f.input); if (ready.status !== 'ready') throw new Error('Expected proposal');
  const proposal = ready.read(); let root = {},tick = 10,allowed = true, remaining = 3;
  const state = createMemoryPort(() => root), staging = createLaborTaskStaging(state); staging.stage(proposal,1,() => true);
  const worker: LaborActor = { id: 'actor',name: 'worker',owner: 'home',body: [...proposal.input.request.body],position: { ...proposal.input.pickup },energy: 0,spawning: false };
  const calls: string[] = [],completed: LaborProgress[] = [],failures: { reason: string; progress: LaborProgress }[] = [];
  const ports: LaborTaskPorts<null> = { now: () => tick,worker: () => worker,authorized: () => allowed,recoverable: () => true,remainingWork: () => remaining,
    move: (_,point) => { calls.push('move'); worker.position = { ...point }; },pickup: () => { calls.push('pickup'); return true; },
    work: () => { calls.push('work'); return true; },deposit: () => { calls.push('return'); return true; },completed: (_,progress) => { completed.push({ ...progress }); },failed: (_,progress,__,reason) => { failures.push({ reason,progress: { ...progress } }); },
  };
  const run = () => createTaskRunner(state,{ 'household-labor': createLaborTaskBehavior(ports) },() => tick)('worker',null);
  return { worker,calls,completed,failures,staging,run,at: (value: number) => { tick = value; },allow: (value: boolean) => { allowed = value; },target: (value: number) => { remaining = value; },reload: () => { root = JSON.parse(JSON.stringify(root)); } };
}
test('task phases confirm next-tick cargo changes across reconstruction and never repeat a pending intent',() => {
  const f = fixture(); f.run(); f.reload(); f.run(); expect(f.calls).toEqual(['pickup']);
  expect(f.staging.read('worker')?.queue[0]?.payload).toMatchObject({ progress: { picked: 0,pending: { kind: 'pickup',tick: 10 } } });
  f.at(11); f.worker.energy = 3; f.run(); f.at(12); f.run(); f.at(16); f.run(); f.reload(); f.run(); expect(f.calls.filter(call => call === 'work')).toHaveLength(1);
  f.at(17); f.worker.energy = 0; f.run(); f.at(20); expect(f.run()?.status).toBe('done');
  expect(f.completed).toMatchObject([{ picked: 3,spent: 3,returned: 0,pending: null }]); expect(f.staging.read('worker')?.queue).toEqual([]);
});
test('successful issue without settled cargo cannot be counted as productive work',() => {
  const f = fixture(); f.run(); f.at(11); expect(f.run()).toMatchObject({ status: 'failed',reason: 'labor-settlement' });
  expect(f.completed).toEqual([]); expect(f.calls).toEqual(['pickup']); expect(f.staging.read('worker')?.queue).toEqual([]);
});
test('lost authority, changed body and changed target stop effects and never report fulfillment',() => {
  const denied = fixture(); denied.allow(false); expect(denied.run()?.status).toBe('failed'); expect(denied.calls).toEqual([]);
  const damaged = fixture(); damaged.worker.body = ['carry','move']; expect(damaged.run()?.status).toBe('failed'); expect(damaged.calls).toEqual([]);
  const changed = fixture(); changed.run(); changed.at(11); changed.worker.energy = 3; changed.run(); changed.at(16); changed.target(0);
  expect(changed.run()?.status).toBe('running'); changed.at(17); changed.run(); changed.reload(); changed.run();
  expect(changed.calls.filter(call => call === 'return')).toHaveLength(1); changed.at(18); changed.worker.energy = 0;
  expect(changed.run()).toMatchObject({ status: 'failed',reason: 'labor-target-changed' }); expect(changed.completed).toEqual([]);
  expect(changed.failures).toMatchObject([{ reason: 'labor-target-changed',progress: { picked: 3,spent: 0,returned: 3 } }]);
});

test('disabled productive authority refunds confirmed cargo across reset without completing work',() => {
  const f = fixture(); f.run(); f.at(11); f.worker.energy = 3; f.allow(false); f.run();
  f.reload(); f.run(); expect(f.calls.filter(call => call === 'return')).toHaveLength(1);
  f.at(12); f.worker.energy = 0; expect(f.run()?.status).toBe('failed');
  expect(f.completed).toEqual([]); expect(f.failures[0]).toMatchObject({ progress: { picked: 3,spent: 0,returned: 3 } });
  expect(f.staging.read('worker')?.queue).toEqual([]);
});
