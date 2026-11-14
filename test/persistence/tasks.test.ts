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
  state.queue.push({ id: 'task-a', kind: 'harvest', phase: 'travel', payload: 'source-id', wakeAt: 100 });
  saveState(port, 'tasks/miner-a', schema, state);
  memory = JSON.parse(JSON.stringify(memory));
  expect(openState(createMemoryPort(() => memory), 'tasks/miner-a', taskSchema('miner-a', definitions))).toEqual(state);
});

test('unknown handlers, invalid phase, duplicate IDs and oversized queues are rejected', () => {
  const schema = taskSchema('miner-a', definitions, 1);
  const task = { id: 'task-a', kind: 'harvest', phase: 'travel', payload: 'source-id', wakeAt: 0 };
  expect(schema.valid({ unit: 'miner-a', queue: [task] })).toBe(true);
  for (const queue of [[{ ...task, kind: 'unknown' }], [{ ...task, phase: 'invalid' }], [task, task]]) expect(schema.valid({ unit: 'miner-a', queue })).toBe(false);
  expect(taskSchema('miner-a', definitions, 2).valid({ unit: 'miner-a', queue: [task, task] })).toBe(false);
});
