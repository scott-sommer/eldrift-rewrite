import { expect, test } from 'vitest';
import { createTaskRunner, taskScope } from '../../src/app/task-runner';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { taskSchema } from '../../src/persistence/tasks/schema';
import { createReservations } from '../../src/persistence/reservations/store';
import { reservationSchema } from '../../src/persistence/reservations/schema';

test('task execution checkpoints blockage, survives reset and releases only terminal task claims', () => {
  let memory = {};
  let tick = 1;
  let calls = 0;
  let complete = false;
  const behaviors = { mine: { phases: ['work'], validPayload: (value: unknown) => value === 'source', handlers: () => ({ work: () => {
    calls++;
    return complete ? { status: 'done' as const } : { status: 'blocked' as const, retryAt: 3, reason: 'occupied' };
  } }) } };
  let port = createMemoryPort(() => memory);
  const schema = taskSchema('miner', behaviors);
  const state = openState(port, 'tasks/miner', schema);
  state.queue.push({ id: 'one', kind: 'mine', phase: 'work', payload: 'source', retries: 0, wakeAt: 0, expiresAt: 20 });
  saveState(port, 'tasks/miner', schema, state);
  createReservations(port).acquire({ resource: 'source', holder: 'miner', scope: taskScope('miner', 'one'), expiresAt: 20 }, tick);
  let run = createTaskRunner(port, behaviors, () => tick);
  expect(run('miner', {})?.status).toBe('blocked');
  expect(run('miner', {})).toBeUndefined();
  expect(calls).toBe(1);
  memory = JSON.parse(JSON.stringify(memory));
  port = createMemoryPort(() => memory);
  run = createTaskRunner(port, behaviors, () => tick);
  tick = 2;
  run('miner', {});
  expect(calls).toBe(1);
  expect(openState(port, 'tasks/miner', schema).queue[0]!.retries).toBe(1);
  tick = 3;
  complete = true;
  expect(run('miner', {})?.status).toBe('done');
  expect(openState(port, 'tasks/miner', schema).queue).toEqual([]);
  expect(openState(port, 'reservations/empire', reservationSchema).claims).toEqual([]);
});

