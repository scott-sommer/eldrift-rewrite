import { expect, test } from 'vitest';
import { taskSchema } from '../../src/persistence/tasks/schema';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
const definitions = { harvest: { phases: ['travel', 'extract'], validPayload: (value: unknown) => typeof value === 'string' } };

test('task phase, target ID and wake tick survive reset without persisting handlers', () => {
  let memory = {};
  const schema = taskSchema('miner-a', definitions);
  const port = createMemoryPort(() => memory);
  const state = openState(port, 'tasks/miner-a', schema);
  state.queue.push({ id: 'task-a', kind: 'harvest', phase: 'travel', payload: 'source-id', wakeAt: 100, retries: 0, expiresAt: 1000 });
  saveState(port, 'tasks/miner-a', schema, state);
  memory = JSON.parse(JSON.stringify(memory));
  expect(openState(createMemoryPort(() => memory), 'tasks/miner-a', taskSchema('miner-a', definitions))).toEqual(state);
});

test('unknown handlers, invalid phase, duplicate IDs and oversized queues are rejected', () => {
  const schema = taskSchema('miner-a', definitions, 1);
  const task = { id: 'task-a', kind: 'harvest', phase: 'travel', payload: 'source-id', wakeAt: 0, retries: 0, expiresAt: 1000 };
  expect(schema.valid({ unit: 'miner-a', queue: [task] })).toBe(true);
  for (const queue of [[{ ...task, kind: 'unknown' }], [{ ...task, phase: 'invalid' }], [task, task]]) expect(schema.valid({ unit: 'miner-a', queue })).toBe(false);
  expect(taskSchema('miner-a', definitions, 2).valid({ unit: 'miner-a', queue: [task, task] })).toBe(false);
});


test('v1 tasks migrate once and persisted retries survive later reconstruction', () => {
  let memory = {};
  let port = createMemoryPort(() => memory);
  port.write('tasks/miner-a', { owner: 'tasks', version: 1, data: { unit: 'miner-a', queue: [{ id: 'old', kind: 'harvest', phase: 'travel', payload: 'source', wakeAt: 5 }] } });
  const schema = taskSchema('miner-a', definitions);
  const state = openState(port, 'tasks/miner-a', schema);
  expect(state.queue[0]).toMatchObject({ retries: 0, expiresAt: Number.MAX_SAFE_INTEGER });
  state.queue[0]!.retries = 3;
  state.queue[0]!.expiresAt = 50;
  saveState(port, 'tasks/miner-a', schema, state);
  memory = JSON.parse(JSON.stringify(memory));
  port = createMemoryPort(() => memory);
  expect(openState(port, 'tasks/miner-a', schema).queue[0]).toMatchObject({ retries: 3, expiresAt: 50 });
  expect(port.read('tasks/miner-a')).toMatchObject({ version: 2 });
  state.queue[0]!.retries = -1;
  expect(() => saveState(port, 'tasks/miner-a', schema, state)).toThrow('invalid state');
});
