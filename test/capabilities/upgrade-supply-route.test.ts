import { expect, test } from 'vitest';
import { upgradeSupplyOwner } from '../../src/features/work/upgrade-supply';
import { upgradeSupplyTarget } from '../../src/features/work/upgrade-supply-identity';
import { acceptsLocalLogistics, localLogisticsDemand } from '../../src/app/native-logistics-admission';
test('upgrade supply routes match their exact sponsor and reject malformed ownership', () => {
  const owner = upgradeSupplyOwner('W0N1', 'E0N1');
  expect(upgradeSupplyTarget(owner, 'W0N1')).toBe('E0N1');
  expect(upgradeSupplyTarget(owner, 'W1N1')).toBeUndefined();
  for (const invalid of ['upgrade-supply:', 'upgrade-supply:[]', 'upgrade-supply:["W0N1","W0N1"]', 'upgrade-supply:["W0N1",3]', 'recovery-support:["W0N1","E0N1"]']) {
    expect(upgradeSupplyTarget(invalid, 'W0N1')).toBeUndefined();
  }
});
test('local hauling never recruits for or takes upgrade supply requests', () => {
  const request = { id: 'shipment', owner: upgradeSupplyOwner('W0N1', 'E0N1'), source: 'storage', sink: 'target',
    resource: 'energy', quantity: 100, priority: 88, expiresAt: 1000 };
  expect(acceptsLocalLogistics(request, 'W0N1', false, true)).toBe(false);
  expect(acceptsLocalLogistics(request, 'W0N1', true, false)).toBe(false);
  expect(localLogisticsDemand(request, 'W0N1', false)).toBe(false);
  expect(acceptsLocalLogistics({ ...request, owner: 'ordinary' }, 'W0N1', false, false)).toBe(true);
});
