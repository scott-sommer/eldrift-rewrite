import { expect, test } from 'vitest';
import { openState } from '../../src/persistence/versioned-state';
import type { StateSchema } from '../../src/persistence/versioned-state';
const schema: StateSchema<{ count: number }> = { owner: 'test', version: 1, initial: () => ({ count: 0 }), valid: (data): data is { count: number } => !!data && typeof data === 'object' && 'count' in data && typeof data.count === 'number', migrations: { 0: data => ({ count: data }) } };

test('migration commits only validated output and reopening is idempotent', () => {
  let stored: unknown = { owner: 'test', version: 0, data: 4 };
  let writes = 0;
  const port = { read: () => stored, write: (_key: string, value: unknown) => { stored = value; writes++; } };
  expect(openState(port, 'colony', schema)).toEqual({ count: 4 });
  expect(openState(port, 'colony', schema)).toEqual({ count: 4 });
  expect(writes).toBe(1);
});

test.each([null, { owner: 'other', version: 1, data: {} }, { owner: 'test', version: 2, data: {} }, { owner: 'test', version: 0, data: 'invalid' }])('invalid or incompatible state remains untouched', stored => {
  const before = JSON.stringify(stored);
  let writes = 0;
  expect(() => openState({ read: () => stored, write: () => { writes++; } }, 'colony', schema)).toThrow();
  expect(writes).toBe(0);
  expect(JSON.stringify(stored)).toBe(before);
});
