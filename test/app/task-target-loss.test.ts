import { expect, test } from 'vitest';
import { createTaskRunner, taskScope } from '../../src/app/task-runner';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { taskSchema } from '../../src/persistence/tasks/schema';
import { createReservations } from '../../src/persistence/reservations/store';
import { reservationSchema } from '../../src/persistence/reservations/schema';
import { workStep } from '../../src/capabilities/work/step';

test('target loss after reset fails the active task, releases its claim and preserves queued work', () => {
  let memory = {};
  let tick = 1;
  let target: 'visible' | 'missing' = 'visible';
  let actions = 0;
  const port = createMemoryPort(() => memory);
  const behaviors = { build: { phases: ['work'], validPayload: (v: unknown) => v === 'site', handlers: () => ({ work: () => workStep({ tick, complete: false, target, inRange: true, energy: 10 }, {
    approach: () => ({ status: 'running' }),
    act: () => { actions++; return { status: 'issued', code: 0 }; },
    rejected: code => ({ status: 'failed', reason: String(code) }),
  }) }) } };
  const schema = taskSchema('worker', behaviors);
  const state = openState(port, 'tasks/worker', schema);
  for (const id of ['first', 'next']) {
    state.queue.push({ id, kind: 'build', phase: 'work', payload: 'site', wakeAt: 0, retries: 0, expiresAt: 100 });
    createReservations(port).acquire({ resource: id, holder: 'worker', scope: taskScope('worker', id), expiresAt: 100 }, tick);
  }
  saveState(port, 'tasks/worker', schema, state);
  let run = createTaskRunner(port, behaviors, () => tick);
  expect(run('worker', {})).toEqual({ status: 'running' });
  expect(openState(port, 'tasks/worker', schema).queue).toHaveLength(2);
  memory = JSON.parse(JSON.stringify(memory));
  tick++;
  target = 'missing';
  run = createTaskRunner(port, behaviors, () => tick);
  expect(run('worker', {})).toEqual({ status: 'failed', reason: 'target-missing' });
  expect(run('worker', {})).toBeUndefined();
  expect(actions).toBe(1);
  expect(openState(port, 'tasks/worker', schema).queue.map(task => task.id)).toEqual(['next']);
  expect(openState(port, 'reservations/empire', reservationSchema).claims.map(claim => claim.resource)).toEqual(['next']);
});
