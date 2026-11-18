import { afterEach, expect, test, vi } from 'vitest';
import { createNativeIntelFeature } from '../../src/app/native-intel';
import { observeNativeIntel } from '../../src/app/native-intel-observation';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createIntelStore } from '../../src/features/intel/store';
import { resolveConfig } from '../../src/config/resolve';
import type { EmpireFeatureContext } from '../../src/app/runtime-model';
import { intelSummary } from '../fixtures/intel-summary';
vi.mock('../../src/app/native-intel-observation', () => ({ observeNativeIntel: vi.fn() }));
afterEach(() => { vi.unstubAllGlobals(); vi.resetAllMocks(); });
function setup(empire = {}, overrides: Record<string, object> = {}) {
  const memory = {}, state = createMemoryPort(() => memory), reportFailure = vi.fn();
  const names = ['W1N1','W2N1','W3N1'];
  const config = resolveConfig({ empire: { intelEnabled: true, ...empire } }, 10);
  const context: EmpireFeatureContext = { config,
    rooms: new Map(names.map(name => [name, resolveConfig({ empire: config.values, roomOverride: overrides[name] ?? {} }, 10)])),
    world: { tick: 10, rooms: new Map(names.map(name => [name, { name, owned: false, units: [], structures: [],
      ownUnits: [], allies: [], threats: [], structuresByType: new Map() }])), ownedRooms: [], failures: [] } };
  const cpu = { getUsed: () => 0, tickLimit: 100, bucket: 10000 };
  vi.stubGlobal('Game', { time: 10, cpu });
  vi.mocked(observeNativeIntel).mockImplementation(room => intelSummary(10, room));
  return { memory, state, reportFailure, context, cpu, feature: createNativeIntelFeature(state, { reportFailure }) };
}

test('disabled and zero-budget capture require no native clock or persistent state', () => {
  for (const patch of [{ intelEnabled: false }, { intelCaptureCpuBudget: 0 }, { intelCaptureRooms: 0 }, { intelCaptureScans: 0 }]) {
    const fixture = setup(patch);
    vi.stubGlobal('Game', undefined);
    fixture.feature.run(fixture.context);
    expect(fixture.memory).toEqual({});
    expect(observeNativeIntel).not.toHaveBeenCalled();
  }
});

test('shared attempt cap and per-room background/diplomacy configuration remain independent', () => {
  const fixture = setup({ intelCaptureRooms: 1 }, { W1N1: { backgroundEnabled: false }, W2N1: { minimumBucket: 10000 } });
  fixture.cpu.bucket = 9000;
  fixture.feature.run(fixture.context);
  expect(observeNativeIntel).toHaveBeenCalledExactlyOnceWith('W3N1');
  const view = createIntelStore(fixture.state).peek('W3N1', 10);
  expect(view.record.lastVisit).toBeNull();
  expect(view.record.summary?.sources).toHaveLength(1);
  expect(fixture.state.read('intel/W1N1')).toBeUndefined();
  expect(fixture.state.read('intel/W2N1')).toBeUndefined();
});

test('room failure is recorded and reported while another room captures; recent failure cools down', () => {
  const fixture = setup({ intelCaptureRooms: 2 });
  vi.mocked(observeNativeIntel).mockImplementation(room => {
    if (room === 'W1N1') throw new Error('status unavailable');
    return intelSummary(10, room);
  });
  fixture.feature.run(fixture.context);
  expect(observeNativeIntel).toHaveBeenCalledTimes(2);
  expect(fixture.reportFailure).toHaveBeenCalledWith(expect.objectContaining({ room: 'W1N1', id: 'intel-capture' }));
  expect(createIntelStore(fixture.state).peek('W1N1', 10).record.lastFailure).toMatchObject({ tick: 10, reason: 'status unavailable' });
  expect(createIntelStore(fixture.state).peek('W2N1', 10).record.lastSeen).toBe(10);
  vi.mocked(observeNativeIntel).mockClear();
  fixture.feature.run(fixture.context);
  expect(vi.mocked(observeNativeIntel).mock.calls.map(call => call[0])).toEqual(['W3N1']);
});

test('ordinary route failure does not suppress capture and hidden native vision does not erase facts', () => {
  const fixture = setup({ intelCaptureRooms: 3, intelCaptureInterval: 1 });
  const store = createIntelStore(fixture.state);
  store.observeSummary(intelSummary(1, 'W1N1'), true);
  store.recordFailure('W1N1', { id: 'route:unit:10', tick: 10, reason: 'no route' });
  vi.mocked(observeNativeIntel).mockImplementation(room => room === 'W2N1' ? undefined : intelSummary(10, room));
  fixture.feature.run(fixture.context);
  expect(store.peek('W1N1', 10)).toMatchObject({ record: { lastSeen: 10, lastVisit: 1, lastFailure: { id: 'route:unit:10' } } });
  expect(fixture.state.read('intel/W2N1')).toBeUndefined();
});

test('CPU consumed by a capture prevents starting the next room', () => {
  const fixture = setup({ intelCaptureRooms: 3, intelCaptureCpuBudget: 3 });
  let used = 0;
  fixture.cpu.getUsed = () => used;
  vi.mocked(observeNativeIntel).mockImplementation(room => { used = 4; return intelSummary(10, room); });
  fixture.feature.run(fixture.context);
  expect(observeNativeIntel).toHaveBeenCalledTimes(1);
  expect(fixture.state.read('intel-capture/empire')).toMatchObject({ data: { cursor: 'W1N1' } });
});
