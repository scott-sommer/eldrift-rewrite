import { expect, test, vi } from 'vitest';
import { createNativeConstructionFeature } from '../../src/app/native-construction';
import { createRuntime } from '../../src/app/runtime';
import { resolveConfig } from '../../src/config/resolve';
test('registered construction defaults off without native globals or persistent reads', () => {
  const state = { read: vi.fn(), write: vi.fn() };
  const runtime = createRuntime([createNativeConstructionFeature(state)], {
    observations: { visibleRooms: () => ['W0N1'], observeRoom: name => ({ name, owned: true, units: [], structures: [] }) },
    config: () => ({}), clock: () => ({ tick: 1, tickLimit: 100, bucket: 10000 }), usedCpu: () => 0, reportFailure: vi.fn(),
  });
  expect(runtime.tick().failures).toEqual([]);
  expect(state.read).not.toHaveBeenCalled();
  expect(state.write).not.toHaveBeenCalled();
});
test('construction budgets and retry policy validate through normal config layers', () => {
  const config = resolveConfig({ roomOverride: { constructionEnabled: true, constructionRoomSites: 1 } }, 1).values;
  expect(config.constructionEnabled).toBe(true);
  expect(config.constructionRoomSites).toBe(1);
  expect(() => resolveConfig({ empire: { constructionAttempts: -1 } }, 1)).toThrow();
  expect(() => resolveConfig({ empire: { constructionRetryDelay: 20, constructionRetryMaximumDelay: 10 } }, 1)).toThrow('maximum delay');
});
