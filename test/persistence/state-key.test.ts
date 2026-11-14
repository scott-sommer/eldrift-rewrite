import { expect, test } from 'vitest';
import { stateKey } from '../../src/persistence/state-key';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { taskSchema } from '../../src/persistence/tasks/schema';
import { retireUnitTasks } from '../../src/persistence/tasks/retire';

test('identity encoding is collision-free across punctuation, escapes, unicode and surrogate units', () => {
  const names = ['miner-a', 'miner a', 'miner/a', 'miner%0020a', '矿工', '🚀', '\ud800', '__proto__'];
  const keys = names.map(name => stateKey('tasks', name));
  expect(new Set(keys).size).toBe(names.length);
  expect(keys[0]).toBe('tasks/miner-a');
  const port = createMemoryPort(() => memory);
  const memory = {};
  for (const name of names) {
    const schema = taskSchema(name, {});
    const key = stateKey('tasks', name);
    const state = openState(port, key, schema);
    saveState(port, key, schema, state);
    retireUnitTasks(port, name, {});
    expect(openState(port, key, schema).unit).toBe(name);
  }
});

test('invalid namespace and malformed encoded record keys fail before writing', () => {
  expect(() => stateKey('bad/path', 'unit')).toThrow();
  expect(() => stateKey('tasks', '')).toThrow();
  const port = createMemoryPort(() => ({}));
  for (const key of ['tasks/a/b', 'tasks/%zzzz', 'tasks/%20']) expect(() => port.read(key)).toThrow('Invalid state key');
});
