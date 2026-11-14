import { expect, test } from 'vitest';
import { copyPlain } from '../../src/persistence/plain-data';
import { openState } from '../../src/persistence/versioned-state';

test.each([undefined, NaN, Infinity, () => 1, new Date(), new Map(), { x: undefined }, [undefined]])('rejects data that JSON would lose or transform', value => {
  expect(() => copyPlain(value)).toThrow();
});

test('rejects cycles and getters without executing accessors', () => {
  const cyclic: { self?: unknown } = {};
  cyclic.self = cyclic;
  expect(() => copyPlain(cyclic)).toThrow('cycle');
  let read = false;
  expect(() => copyPlain({ get value() { read = true; return 1; } })).toThrow();
  expect(read).toBe(false);
});

test('initial state returned to caller cannot mutate persisted data', () => {
  let stored: unknown;
  const state = openState({ read: () => stored, write: (_key, value) => { stored = value; } }, 'test', {
    owner: 'test', version: 1, initial: () => ({ count: 0 }), migrations: {}, valid: (data): data is { count: number } => typeof data === 'object' && data !== null && 'count' in data,
  });
  state.count = 42;
  expect(stored).toEqual({ owner: 'test', version: 1, data: { count: 0 } });
});
