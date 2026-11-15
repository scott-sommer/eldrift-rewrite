import { afterEach, expect, test, vi } from 'vitest';
import { createNativePlanningAdmission } from '../../src/app/native-planning-admission';
import { resolveConfig } from '../../src/config/resolve';
afterEach(() => vi.unstubAllGlobals());
test.each([
  { rooms: {}, enabled: true, reason: 'hidden' },
  { rooms: { W0N1: { controller: { my: false } } }, enabled: true, reason: 'not-owned' },
  { rooms: { W0N1: {} }, enabled: true, reason: 'not-owned' },
  { rooms: {}, enabled: false, reason: 'disabled' },
])('ineligible native admission leaves state untouched: $reason', ({ rooms, enabled, reason }) => {
  vi.stubGlobal('Game', { rooms });
  const state = { read: vi.fn(), write: vi.fn() };
  const admit = createNativePlanningAdmission(state, [], 'v1');
  const config = resolveConfig({ roomOverride: { planningEnabled: enabled } }, 1).values;
  expect(admit('W0N1', config)).toEqual({ status: 'unavailable', reason });
  expect(state.read).not.toHaveBeenCalled();
  expect(state.write).not.toHaveBeenCalled();
});
