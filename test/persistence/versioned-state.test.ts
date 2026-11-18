import { expect, test } from 'vitest';
import { openState, peekState } from '../../src/persistence/versioned-state';
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


test('peek validates detached migrated facts without initializing or committing', () => {
  let stored: unknown = undefined;
  let writes = 0;
  const port = { read: () => stored, write: () => { writes++; } };
  expect(peekState(port, 'colony', schema)).toBeUndefined();
  stored = { owner: 'test', version: 0, data: 4 };
  const before = JSON.stringify(stored);
  const result = peekState(port, 'colony', schema)!;
  expect(result).toEqual({ count: 4 });
  result.count = 99;
  expect(peekState(port, 'colony', schema)).toEqual({ count: 4 });
  expect(JSON.stringify(stored)).toBe(before);
  expect(writes).toBe(0);
});

test.each([null, { owner: 'other', version: 1, data: {} }, { owner: 'test', version: 2, data: {} },
  { owner: 'test', version: 0, data: 'invalid' }])('peek refuses invalid state without writes', stored => {
  const before = JSON.stringify(stored);
  let writes = 0;
  expect(() => peekState({ read: () => stored, write: () => { writes++; } }, 'colony', schema)).toThrow();
  expect(JSON.stringify(stored)).toBe(before);
  expect(writes).toBe(0);
});
