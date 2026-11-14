import { expect, test } from 'vitest';
import { supportOwner, supportTarget } from '../../src/features/recovery/support-identity';
import { supportSources, supportSinks } from '../../src/features/recovery/support-endpoints';
test('support route identities round-trip without matching foreign donors or malformed scopes', () => {
  const owner = supportOwner('W0N1', 'W1N1');
  expect(supportTarget(owner, 'W0N1')).toBe('W1N1');
  expect(supportTarget(owner, 'W2N1')).toBeUndefined();
  for (const invalid of ['logistics:W0N1', 'recovery-support:no-json', 'recovery-support:["W0N1",""]', 'recovery-support:["W0N1","W0N1"]']) {
    expect(supportTarget(invalid, 'W0N1')).toBeUndefined();
  }
  expect(() => supportOwner('W0N1', 'W0N1')).toThrow('Invalid support route');
});
test('donor reserve is combined across owned stores with storage-first withdrawal preference', () => {
  const stores = [{ id: 'terminal', kind: 'terminal' as const, owned: true, energy: 20000 },
    { id: 'storage', kind: 'storage' as const, owned: true, energy: 60000 },
    { id: 'enemy', kind: 'storage' as const, owned: false, energy: 100000 }];
  expect(supportSources(stores, 75000).map(item => [item.id, item.amount])).toEqual([['storage', 5000], ['terminal', 0]]);
  expect(supportSources(stores, 80000).every(item => item.amount === 0)).toBe(true);
  expect(supportSources(stores, 0).map(item => item.amount)).toEqual([60000, 20000]);
  expect(supportSources(stores, 10000).map(item => item.amount)).toEqual([60000, 10000]);
  expect(() => supportSources(stores, -1)).toThrow('Invalid donor reserve');
  expect(() => supportSources([...stores, stores[0]!], 0)).toThrow('Duplicate support store');
});
test('full or unavailable destinations fall back without selecting foreign or inactive structures', () => {
  const sinks = [
    { id: 'storage', kind: 'storage', free: 0 }, { id: 'terminal', kind: 'terminal', free: 30 },
    { id: 'spawn', kind: 'spawn', free: 100 }, { id: 'extension', kind: 'extension', free: 50 },
    { id: 'container', kind: 'container', free: 100 },
  ].map(item => ({ ...item, owned: true, active: true }));
  expect(supportSinks([...sinks, { id: 'foreign', kind: 'storage', free: 1000, owned: false, active: true },
    { id: 'inactive', kind: 'storage', free: 1000, owned: true, active: false }]).map(item => item.id)).toEqual(['terminal', 'spawn', 'extension']);
  expect(() => supportSinks([{ ...sinks[0]!, free: NaN }])).toThrow('Invalid support sinks');
});
