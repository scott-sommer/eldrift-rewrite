import { expect, test } from 'vitest';
import { framedIdentity } from '../../src/core/framed-identity';
test('framing distinguishes boundaries, empty fields and arbitrary text', () => {
  const tuples = [[], [''], ['', ''], ['a', 'bc'], ['ab', 'c'], ['1:a', ''], ['1:', 'a'],
    [String.fromCodePoint(128512), ':'], ['"', String.fromCharCode(92)]];
  expect(new Set(tuples.map(framedIdentity)).size).toBe(tuples.length);
  for (const parts of tuples) {
    const encoded = framedIdentity(parts), decoded: string[] = [];
    let cursor = 0;
    while (cursor < encoded.length) {
      const separator = encoded.indexOf(':', cursor), length = Number(encoded.slice(cursor, separator));
      decoded.push(encoded.slice(separator + 1, separator + 1 + length));
      cursor = separator + 1 + length;
    }
    expect(decoded).toEqual(parts);
  }
});
test('nesting adds only framing overhead rather than repeatedly escaping contents', () => {
  const payload = JSON.stringify({ text: '"'.repeat(1000) });
  let value = payload;
  for (let layer = 0; layer < 10; layer++) value = framedIdentity(['layer', value]);
  expect(value.length).toBeLessThan(payload.length + 200);
});
