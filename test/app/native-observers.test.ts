import { observerHomeEnabled } from '../../src/app/native-observer-admission';
import { resolveConfig } from '../../src/config/resolve';
import { afterEach, expect, test, vi } from 'vitest';
import { createNativeObservers } from '../../src/app/native-observers';
import { createRuntime } from '../../src/app/runtime';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createObservationStore } from '../../src/features/intel/observation/store';
import type { ConfigInput } from '../../src/config/model';
afterEach(() => vi.unstubAllGlobals());
function fixture(config: ConfigInput) {
  const root = {}, state = createMemoryPort(() => root), observe = vi.fn(() => 0);
  let tick = 1;
  vi.stubGlobal('STRUCTURE_OBSERVER', 'observer'); vi.stubGlobal('ERR_INVALID_TARGET', -7);
  vi.stubGlobal('Game', { rooms: {}, cpu: { getUsed: () => 0, tickLimit: 100, bucket: 10000 },
    getObjectById: () => ({ id: 'observer', my: true, structureType: 'observer' }) });
  const runtime = createRuntime([createNativeObservers(state, { observe }, { reportFailure: () => {} })], {
    observations: { visibleRooms: () => ['W0N1'], observeRoom: name => ({ name, owned: true, units: [],
      structures: [{ id: 'observer', type: 'observer', owned: true }] }) },
    config: () => config, clock: () => ({ tick: tick++, tickLimit: 100, bucket: 10000 }),
    usedCpu: () => 0, reportFailure: () => {},
  });
  return { root, state, observe, runtime };
}
test('disabled native observer registration creates no feature or intel state', () => {
  const f = fixture({}); expect(f.runtime.tick().failures).toEqual([]);
  expect(f.root).toEqual({}); expect(f.observe).not.toHaveBeenCalled();
});
test('zero observer CPU admission preserves standing specialist requests without native actions', () => {
  const f = fixture({ empire: { observersEnabled: true, observerCpuBudget: 0 } });
  const store = createObservationStore(f.state);
  store.submit({ id: 'manual', owner: 'operator', home: 'W0N1', room: 'E0N1', priority: 1, requestedAt: 1, expiresAt: 10 }, 1);
  const before = store.read(); expect(f.runtime.tick().failures).toEqual([]);
  expect(store.read()).toEqual(before); expect(f.observe).not.toHaveBeenCalled();
});
test('one scan per tick still progresses from automatic request to issue and missed-vision receipt', () => {
  const f = fixture({ empire: { observersEnabled: true, observerScanBudget: 1, observerAssignedRooms: ['E0N1'] } });
  for (let count = 0; count < 3; count++) expect(f.runtime.tick().failures).toEqual([]);
  expect(f.observe).toHaveBeenCalledTimes(1);
  expect(createObservationStore(f.state).read().receipts[0]).toMatchObject({ outcome: 'missed', issuedAt: 2, completedAt: 3 });
});

test('per-home background, bucket and fraction policy pauses new observation admission', () => {
  fixture({});
  const base = resolveConfig({ empire: { observersEnabled: true } }, 1).values;
  expect(observerHomeEnabled(base)).toBe(true);
  expect(observerHomeEnabled({ ...base, backgroundEnabled: false })).toBe(false);
  expect(observerHomeEnabled({ ...base, backgroundCpuFraction: 0 })).toBe(false);
  Game.cpu.bucket = 0;
  expect(observerHomeEnabled(base)).toBe(false);
  expect(observerHomeEnabled(undefined)).toBe(false);
});
