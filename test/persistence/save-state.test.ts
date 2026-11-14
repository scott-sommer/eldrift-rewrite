import { expect, test } from 'vitest';
import { openState, saveState } from '../../src/persistence/versioned-state';
import type { StateSchema } from '../../src/persistence/versioned-state';
const schema: StateSchema<{ count: number }> = { owner: 'colony', version: 1, initial: () => ({ count: 0 }), migrations: {}, valid: (data): data is { count: number } => !!data && typeof data === 'object' && 'count' in data && typeof data.count === 'number' && Number.isFinite(data.count) };

test('explicit save persists detached data and a reconstructed reader recovers it', () => {
  let stored: unknown;
  const port = { read: () => stored, write: (_key: string, data: unknown) => { stored = data; } };
  const state = openState(port, 'room', schema);
  state.count = 5;
  expect(openState(port, 'room', schema).count).toBe(0);
  saveState(port, 'room', schema, state);
  state.count = 9;
  expect(openState(port, 'room', schema).count).toBe(5);
});

test.each([undefined, { owner: 'mission', version: 1, data: {} }, { owner: 'colony', version: 2, data: {} }, { owner: 'colony', version: 0, data: {} }])('save rejects missing, foreign or mismatched state', stored => {
  let writes = 0;
  expect(() => saveState({ read: () => stored, write: () => { writes++; } }, 'room', schema, { count: 1 })).toThrow();
  expect(writes).toBe(0);
});
