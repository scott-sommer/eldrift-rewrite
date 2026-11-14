import { expect, test } from 'vitest';
import { cancelTask } from '../../src/app/cancel-task';
import { taskScope } from '../../src/app/task-runner';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { taskSchema } from '../../src/persistence/tasks/schema';
import { createReservations } from '../../src/persistence/reservations/store';
import { reservationSchema } from '../../src/persistence/reservations/schema';

test('cancellation can replay after claim release but failed queue save, preserving sibling work', () => {
  let memory = {};
  let port = createMemoryPort(() => memory);
  const definitions = { work: { phases: ['run'], validPayload: (value: unknown) => value === null } };
  const schema = taskSchema('unit', definitions);
  const state = openState(port, 'tasks/unit', schema);
  for (const id of ['one', 'two']) {
    state.queue.push({ id, kind: 'work', phase: 'run', payload: null, retries: 0, wakeAt: 0, expiresAt: 100 });
    createReservations(port).acquire({ resource: id, holder: 'unit', scope: taskScope('unit', id), expiresAt: 100 }, 1);
  }
  saveState(port, 'tasks/unit', schema, state);
  const failing = { read: port.read, write: (key: string, value: Parameters<typeof port.write>[1]) => {
    if (key === 'tasks/unit') throw new Error('interrupted');
    port.write(key, value);
  } };
  expect(() => cancelTask(failing, 'unit', 'one', definitions)).toThrow('interrupted');
  memory = JSON.parse(JSON.stringify(memory));
  port = createMemoryPort(() => memory);
  expect(cancelTask(port, 'unit', 'one', definitions)).toBe(true);
  expect(cancelTask(port, 'unit', 'one', definitions)).toBe(false);
  expect(openState(port, 'tasks/unit', schema).queue.map(task => task.id)).toEqual(['two']);
  expect(openState(port, 'reservations/empire', reservationSchema).claims.map(claim => claim.resource)).toEqual(['two']);
});
