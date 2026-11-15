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

test('rejects a sparse array whose extra property masks its missing index', () => {
  const value = [1, 2];
  Reflect.deleteProperty(value, '0');
  Object.assign(value, { extra: 3 });
  expect(() => copyPlain(value)).toThrow('extended array');
  expect(copyPlain([1, 2])).toEqual([1, 2]);
});

test('plain copy preserves JSON normalization while detaching shared references', () => {
  const shared = { nested: [1, 'value', null, true] };
  const value = Object.assign(Object.create(null), { first: shared, second: shared, negativeZero: -0 });
  const copied = copyPlain(value);
  expect(copied).toEqual(JSON.parse(JSON.stringify(value)));
  expect(Object.getPrototypeOf(copied)).toBe(Object.prototype);
  expect(Object.is(copied.negativeZero, -0)).toBe(false);
  expect(copied.first).not.toBe(shared);
  expect(copied.first).not.toBe(copied.second);
});
test('prototype-like keys remain data without changing the destination prototype', () => {
  const value = JSON.parse('{"__proto__":{"polluted":true},"constructor":"data","prototype":[1]}');
  const copied = copyPlain(value);
  expect(Object.getPrototypeOf(copied)).toBe(Object.prototype);
  expect(Object.hasOwn(copied, '__proto__')).toBe(true);
  expect(copied.polluted).toBeUndefined();
  expect(JSON.stringify(copied)).toBe(JSON.stringify(value));
});
test('symbols, hidden properties and validation-budget overflow remain rejected', () => {
  expect(() => copyPlain({ [Symbol('hidden')]: 1 })).toThrow('non-data');
  expect(() => copyPlain(Object.defineProperty({}, 'hidden', { value: 1 }))).toThrow('non-data');
  expect(() => copyPlain(Array(100001).fill(0))).toThrow('validation budget');
  let deep: unknown = 0;
  for (let depth = 0; depth < 102; depth++) deep = { child: deep };
  expect(() => copyPlain(deep)).toThrow('validation budget');
});
