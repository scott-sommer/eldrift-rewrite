import { expect, test } from 'vitest';
import { createLaborTaskBehavior } from '../../src/app/labor-task';
import { createTaskRunner } from '../../src/app/task-runner';
import { createLaborTaskStaging } from '../../src/features/work/stage-labor-task';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { laborProposalFixture } from '../fixtures/household-labor-proposal';
import type { StatePort } from '../../src/persistence/versioned-state';
import type { LaborTaskPayload } from '../../src/features/work/labor-task';
import type { LaborActor, LaborTaskPorts } from '../../src/app/labor-task-model';
function fixture(mode: 'before' | 'after' | 'reject') {
  const f = laborProposalFixture(), ready = f.propose(f.input); if (ready.status !== 'ready') throw new Error('Expected proposal');
  let root = {},tick = 10,tripped = false,calls = 0;
  const base = createMemoryPort(() => root); createLaborTaskStaging(base).stage(ready.read(),1,() => true);
  const state: StatePort = { read: key => base.read(key),write(key,value) {
    base.write(key,value); const data = value.data as { queue?: { payload?: LaborTaskPayload }[] };
    if (mode === 'before' && !tripped && key === 'tasks/worker' && data.queue?.[0]?.payload?.progress?.pending) { tripped = true; throw new Error('interrupt'); }
  } };
  const worker: LaborActor = { id: 'actor',name: 'worker',owner: 'home',body: [...f.input.request.body],position: { ...f.input.pickup },energy: 0,spawning: false };
  const ports: LaborTaskPorts<null> = { now: () => tick,worker: () => worker,authorized: () => true,recoverable: () => true,remainingWork: () => 3,move: (_,point) => { worker.position = { ...point }; },
    pickup: () => { calls++; if (mode === 'after' && !tripped) { tripped = true; throw new Error('interrupt'); } return mode !== 'reject'; },work: () => true,deposit: () => true,completed: () => {} };
  const run = () => createTaskRunner(state,{ 'household-labor': createLaborTaskBehavior(ports) },() => tick)('worker',null);
  return { worker,run,state,at: (value: number) => { tick = value; },calls: () => calls,reload: () => { root = JSON.parse(JSON.stringify(root)); },read: () => createLaborTaskStaging(state).read('worker') };
}
test.each(['before','after'] as const)('prepared pickup survives %s-call interruption and same-tick reconstruction without retry',mode => {
  const f = fixture(mode); expect(f.run).toThrow('interrupt'); f.reload();
  expect(f.read()?.queue[0]).toMatchObject({ phase: 'pickup',payload: { progress: { pending: { kind: 'pickup',tick: 10,before: 0,maximum: 3 } } } });
  f.run(); expect(f.calls()).toBe(mode === 'before' ? 0 : 1);
  f.at(11); f.worker.energy = mode === 'before' ? 0 : 3;
  const result = f.run();
  if (mode === 'before') { expect(result?.status).toBe('failed'); expect(f.read()?.queue).toEqual([]); }
  else expect(f.read()?.queue[0]?.payload).toMatchObject({ progress: { picked: 3,pending: null } });
});
test('known rejection clears the prepared intent in the final owner save',() => {
  const f = fixture('reject'); f.run(); f.reload(); expect(f.read()?.queue[0]?.payload).toMatchObject({ progress: { picked: 0,pending: null } });
});
