import { expect, test } from 'vitest';
import { copyPlain, parsePlain } from '../../src/persistence/plain-data';
test('parsed JSON matches validated plain copies, including own prototype keys and negative zero', () => {
  const source = '{"__proto__":{"allowed":true},"array":[-0,1,null,false,{"text":"value"}]}';
  const result = parsePlain(source) as { array: unknown[] };
  expect(result).toEqual(copyPlain(JSON.parse(source)));
  expect(Object.is(result.array[0], -0)).toBe(false);
  expect(Object.hasOwn(result, '__proto__')).toBe(true);
  expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
  result.array.push(2);
  expect((parsePlain(source) as { array: unknown[] }).array).toHaveLength(5);
});
test('parsed payloads retain finite-number, node and depth limits', () => {
  for (const source of ['1e999', '{', JSON.stringify(Array(100001).fill(0)), '['.repeat(101) + '0' + ']'.repeat(101)]) {
    expect(() => parsePlain(source)).toThrow();
  }
  expect(parsePlain('['.repeat(100) + '0' + ']'.repeat(100))).toEqual(copyPlain(JSON.parse('['.repeat(100) + '0' + ']'.repeat(100))));
});
