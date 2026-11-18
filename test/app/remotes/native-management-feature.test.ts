import { expect, test, vi } from 'vitest';
import { createNativeRemoteManagementFeature } from '../../../src/app/remotes/management/feature';
import { createRuntime } from '../../../src/app/runtime';
import { resolveConfig } from '../../../src/config/resolve';
test('default-off remote registration reads neither native globals nor persistent state', () => {
  const state = { read: vi.fn(),write: vi.fn() };
  const runtime = createRuntime([createNativeRemoteManagementFeature(state)],{
    observations: { visibleRooms: () => ['W0N1'],observeRoom: name => ({ name,owned: true,units: [],structures: [] }) },
    config: () => ({}),clock: () => ({ tick: 1,tickLimit: 100,bucket: 10000 }),usedCpu: () => 0,reportFailure: vi.fn(),
  });
  expect(runtime.tick().failures).toEqual([]); expect(state.read).not.toHaveBeenCalled(); expect(state.write).not.toHaveBeenCalled();
});
test('remote controls resolve through room/temporary layers and validate bounded work and lease timing', () => {
  const blocked = ['E0N1'];
  const config = resolveConfig({ empire: { remoteManagementEnabled: true },roomOverride: { remoteMaximumSlots: 1,remoteBlockedRooms: blocked },
    temporary: { expiresAt: 20,values: { remoteSelectionOrder: 'net-yield' } } },10).values;
  blocked.push('E1N1'); expect(config.remoteBlockedRooms).toEqual(['E0N1']); expect(config.remoteMaximumSlots).toBe(1); expect(config.remoteSelectionOrder).toBe('net-yield');
  expect(() => resolveConfig({ empire: { remoteDiscoveryRooms: 65 } },1)).toThrow();
  expect(() => resolveConfig({ empire: { remoteLeaseLifetime: 100 } },1)).toThrow('lease lifetime');
});
