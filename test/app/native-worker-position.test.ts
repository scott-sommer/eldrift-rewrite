import { expect, test } from 'vitest';
import { nativeWorkerUpgradeRange } from '../../src/app/native-worker-position';
import { resolveConfig } from '../../src/config/resolve';
test('ordinary upgrader positioning is room-configurable without affecting other profiles', () => {
  const empire = { workerMode: 'upgrader', workerEnergyProfile: 'upgrader' };
  expect(nativeWorkerUpgradeRange(resolveConfig({ empire }, 1).values)).toBe(2);
  const wide = resolveConfig({ empire, roomOverride: { workerUpgradeApproachRange: 3 } }, 1);
  expect(nativeWorkerUpgradeRange(wide.values)).toBe(3);
  expect(wide.sources.workerUpgradeApproachRange).toBe('roomOverride');
  for (const workerEnergyProfile of ['balanced', 'builder', 'fortifier', 'upgrader-v2']) {
    expect(nativeWorkerUpgradeRange(resolveConfig({ empire: { ...empire, workerEnergyProfile } }, 1).values)).toBe(3);
  }
  expect(nativeWorkerUpgradeRange(resolveConfig({ empire: { ...empire, workerMode: 'builder' } }, 1).values)).toBe(3);
  for (const value of [0, 4, 1.5, '2', null]) {
    expect(() => resolveConfig({ roomOverride: { workerUpgradeApproachRange: value } }, 1)).toThrow();
  }
});
