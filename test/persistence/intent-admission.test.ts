import { expect, test } from 'vitest';
import { createIntentAdmission } from '../../src/persistence/intent-admission';
import type { Envelope } from '../../src/persistence/versioned-state';
function fixture() {
  const records = new Map<string, Envelope>();
  const port = { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => { records.set(key, structuredClone(value)); } };
  let tick = 1;
  return { port, next: () => tick++, make: () => createIntentAdmission(port, () => tick) };
}
test('structure and body exclusions and energy debits survive reconstruction and expire next tick', () => {
  const f = fixture();
  const budget = { pool: 'room', amount: 80, available: 100 };
  expect(f.make().admit('renew', ['spawn:a', 'body:b'], budget)).toBe(true);
  expect(f.make().admit('boost', ['lab:c', 'body:b'])).toBe(false);
  expect(f.make().admit('spawn', ['spawn:a'])).toBe(false);
  expect(f.make().remaining('room', 100)).toBe(20);
  expect(f.make().admit('other', ['spawn:d'], { ...budget, amount: 21 })).toBe(false);
  expect(f.make().admit('other', ['spawn:d'], { ...budget, amount: 20 })).toBe(true);
  f.next();
  expect(f.make().remaining('room', 100)).toBe(100);
  expect(f.make().admit('boost', ['lab:c', 'body:b'])).toBe(true);
});
test('failed persistence prevents admission and invalid requests cannot reserve keys', () => {
  const f = fixture();
  const admission = f.make();
  expect(() => admission.admit('', ['x'])).toThrow('Invalid');
  expect(() => admission.admit('owner', [], { pool: 'room', amount: 1, available: 1 })).toThrow('Invalid');
  expect(() => admission.admit('owner', ['x'], { pool: 'room', amount: -1, available: 1 })).toThrow('Invalid');
  const failing = createIntentAdmission({ ...f.port, write: () => { throw new Error('write failed'); } }, () => 1);
  expect(() => failing.admit('owner', ['x'])).toThrow('write failed');
  expect(admission.used('x')).toBe(false);
});
