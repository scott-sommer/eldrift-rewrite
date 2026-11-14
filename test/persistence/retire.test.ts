import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createReservations } from '../../src/persistence/reservations/store';
import { reservationSchema } from '../../src/persistence/reservations/schema';
import { retireUnitTasks } from '../../src/persistence/tasks/retire';
import { taskSchema } from '../../src/persistence/tasks/schema';
import { openState, saveState } from '../../src/persistence/versioned-state';

test('confirmed retirement clears tasks and only the retired unit claims across resets', () => {
  let memory = {};
  let port = createMemoryPort(() => memory);
  const definitions = { mine: { phases: ['work'], validPayload: (value: unknown) => typeof value === 'string' } };
  const schema = taskSchema('miner', definitions);
  const state = openState(port, 'tasks/miner', schema);
  state.queue.push({ id: 'mine', kind: 'mine', phase: 'work', payload: 'source', wakeAt: 0 });
  saveState(port, 'tasks/miner', schema, state);
  const claims = createReservations(port);
  claims.acquire({ resource: 'source', holder: 'miner', scope: 'colony', expiresAt: 100 }, 1);
  claims.acquire({ resource: 'other', holder: 'hauler', scope: 'colony', expiresAt: 100 }, 1);
  retireUnitTasks(port, 'miner', definitions);
  memory = JSON.parse(JSON.stringify(memory));
  port = createMemoryPort(() => memory);
  retireUnitTasks(port, 'miner', definitions);
  expect(openState(port, 'tasks/miner', schema).queue).toEqual([]);
  expect(openState(port, 'reservations/empire', reservationSchema).claims.map(claim => claim.holder)).toEqual(['hauler']);
});
