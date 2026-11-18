import { expect, test } from 'vitest';
import { resolveConfig } from '../../src/config/resolve';
import { validatePatch } from '../../src/config/validation';

test('capture activation and freshness are room configurable while limits remain shared', () => {
  const config = resolveConfig({ empire: { intelCaptureRooms: 2, intelCaptureScans: 4, intelCaptureCpuBudget: 1.5 },
    roomOverride: { intelEnabled: true, intelCaptureInterval: 2, intelMaximumAge: 0 } }, 10);
  expect(config.values).toMatchObject({ intelEnabled: true, intelCaptureRooms: 2, intelCaptureScans: 4,
    intelCaptureCpuBudget: 1.5, intelCaptureInterval: 2, intelMaximumAge: 0 });
  expect(resolveConfig({}, 10).values.intelEnabled).toBe(false);
});

test.each(['profile','roomProfile','roomOverride','temporary'])('shared budget rejects misleading %s overrides', layer => {
  for (const key of ['intelCaptureRooms','intelCaptureScans','intelCaptureCpuBudget']) {
    expect(() => validatePatch({ [key]: 1 }, layer)).toThrow('shared capture budget');
  }
});

test.each([['intelCaptureInterval',0],['intelCaptureScans',1.5],['intelCaptureRooms',1001],
  ['intelCaptureCpuBudget',Infinity],['intelMaximumAge',-1],['intelEnabled',1]])('invalid %s is rejected', (key, value) => {
  expect(() => resolveConfig({ empire: { [key]: value } }, 10)).toThrow('invalid');
});
