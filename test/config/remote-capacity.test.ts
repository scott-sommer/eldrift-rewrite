import { expect, test } from 'vitest';
import { resolveConfig } from '../../src/config/resolve';
test('adaptive capacity is opt-in with legacy interval and thresholds',() => {
  expect(resolveConfig({},1).values).toMatchObject({ remoteAdaptiveEnabled: false,remoteAdaptiveInitialSources: 3,remoteAdaptiveInterval: 1500,remoteAdaptiveIncreaseAt: .75,remoteAdaptiveDecreaseAt: .90 });
  expect(resolveConfig({ empire: { remoteAdaptiveEnabled: true },roomOverride: { remoteAdaptiveEnabled: false,remoteAdaptiveMaximumSources: 0 } },1).values).toMatchObject({ remoteAdaptiveEnabled: false,remoteAdaptiveMaximumSources: 0 });
});
test.each([{ remoteAdaptiveInterval: 0 },{ remoteAdaptiveMaximumSources: 129 },{ remoteAdaptiveIncreaseAt: .95 },{ remoteAdaptiveDecreaseAt: .75 },{ remoteAdaptiveInitialSources: -1 }])('invalid adaptive settings are rejected',(empire) => {
  expect(() => resolveConfig({ empire },1)).toThrow();
});
