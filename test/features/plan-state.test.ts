import { expect, test } from 'vitest';
import { planSchema } from '../../src/features/planning/plan-state';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';

test('plan strategy, revision and manual priority survive serialization reset', () => {
  let memory = {};
  const schema = planSchema('W1N1', ['extension', 'road']);
  const port = createMemoryPort(() => memory);
  const state = openState(port, 'plan/W1N1', schema);
  state.strategy = 'constrained'; state.revision = 1;
  state.entries = [{ type: 'extension', x: 20, y: 21, rcl: 3, priority: -1000, source: 'operator' }];
  saveState(port, 'plan/W1N1', schema, state);
  memory = JSON.parse(JSON.stringify(memory));
  expect(openState(createMemoryPort(() => memory), 'plan/W1N1', schema)).toEqual(state);
});

test('schema rejects out-of-room positions, unknown structures and duplicate placements', () => {
  const schema = planSchema('W1N1', ['road']);
  const entry = { type: 'road', x: 10, y: 10, rcl: 1, priority: 0, source: 'strategy' };
  const base = { room: 'W1N1', revision: 0, strategy: null };
  for (const entries of [[{ ...entry, x: 50 }], [{ ...entry, type: 'invalid' }], [entry, entry]]) expect(schema.valid({ ...base, entries })).toBe(false);
});
