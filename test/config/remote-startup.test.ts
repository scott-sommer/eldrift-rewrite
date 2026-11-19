import { expect, test } from 'vitest';
import { resolveConfig } from '../../src/config/resolve';
test('startup strategy and capital/lead controls resolve per home and default to existing eager behavior',() => {
  expect(resolveConfig({},1).values).toMatchObject({ remoteStartupPolicy: 'eager',remoteStartupEnergyReserve: 0,remoteStartupCourierLead: 0 });
  expect(resolveConfig({ empire: { remoteStartupPolicy: 'staged' },roomOverride: { remoteStartupEnergyReserve: 350,remoteStartupCourierLead: 5 } },1).values).toMatchObject({ remoteStartupPolicy: 'staged',remoteStartupEnergyReserve: 350,remoteStartupCourierLead: 5 });
});
test.each([{ remoteStartupPolicy: 'other' },{ remoteStartupEnergyReserve: -1 },{ remoteStartupCourierLead: 1501 }])('invalid startup configuration is rejected',(roomOverride) => {
  expect(() => resolveConfig({ roomOverride },1)).toThrow();
});
