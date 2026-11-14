import { expect, test } from 'vitest';
import { colonySchema } from '../../src/features/colony/state';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { createMemoryPort } from '../../src/adapters/screeps/memory';

test('colony identity, Upgrade Room mode and recovery survive reset', () => {
  let memory = {};
  const schema = colonySchema('W1N1', 'owner');
  const port = createMemoryPort(() => memory);
  const state = openState(port, 'colony/W1N1', schema);
  state.mode = 'upgrade';
  state.recovery = { active: true, checkedAt: 250 };
  saveState(port, 'colony/W1N1', schema, state);
  memory = JSON.parse(JSON.stringify(memory));
  expect(openState(createMemoryPort(() => memory), 'colony/W1N1', schema)).toEqual({ room: 'W1N1', owner: 'owner', mode: 'upgrade', recovery: { active: true, checkedAt: 250 } });
});

test('schema rejects foreign room identity and malformed recovery while retaining previous data', () => {
  const memory = {};
  const port = createMemoryPort(() => memory);
  const schema = colonySchema('W1N1', 'owner');
  const state = openState(port, 'colony/W1N1', schema);
  expect(() => saveState(port, 'colony/W1N1', schema, { ...state, room: 'W2N2' })).toThrow();
  expect(() => saveState(port, 'colony/W1N1', schema, { ...state, recovery: { active: true, checkedAt: -1 } })).toThrow();
  expect(openState(port, 'colony/W1N1', schema).mode).toBe('bootstrap');
});
