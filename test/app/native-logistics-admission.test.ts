import { expect, test } from 'vitest';
import { acceptsLocalLogistics } from '../../src/app/native-logistics-admission';
const request = { id: 'request', owner: 'upgrade-service:W0N1', source: 'source', sink: 'sink', resource: 'energy', quantity: 20, priority: 3, expiresAt: 100 };
test('service admission requires opt-in and pauses even energy service during recovery', () => {
  expect(acceptsLocalLogistics(request, 'W0N1', false, true)).toBe(true);
  expect(acceptsLocalLogistics(request, 'W0N1', false, false)).toBe(false);
  expect(acceptsLocalLogistics(request, 'W0N1', true, true)).toBe(false);
});
test('recovery banking cannot admit minerals; ordinary cargo and support retain scope gates', () => {
  const bank = { ...request, owner: 'local:recovery-bank' };
  expect(acceptsLocalLogistics(bank, 'W0N1', true, false)).toBe(true);
  expect(acceptsLocalLogistics(bank, 'W0N1', false, false)).toBe(false);
  expect(acceptsLocalLogistics({ ...bank, resource: 'H' }, 'W0N1', true, false)).toBe(false);
  expect(acceptsLocalLogistics({ ...request, owner: 'ordinary', resource: 'H' }, 'W0N1', false, false)).toBe(true);
  expect(acceptsLocalLogistics({ ...request, owner: 'ordinary', resource: 'H' }, 'W0N1', true, false)).toBe(false);
  expect(acceptsLocalLogistics({ ...request, owner: 'recovery-support:route' }, 'W0N1', false, true)).toBe(false);
});
