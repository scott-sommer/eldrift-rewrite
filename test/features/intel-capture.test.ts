import { expect, test, vi } from 'vitest';
import { captureIntelCycle } from '../../src/features/intel/capture-cycle';
import type { CaptureLatest } from '../../src/features/intel/capture-cycle';
import { createCaptureProgressStore } from '../../src/features/intel/capture-store';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
function setup() {
  let memory = {};
  const state = createMemoryPort(() => memory), captured: string[] = [];
  return { state, captured, reset: () => { memory = JSON.parse(JSON.stringify(memory)); },
    ports: { progress: createCaptureProgressStore(state), policy: () => ({ enabled: true, interval: 10 }),
      latest: (): CaptureLatest => ({ seen: null, stale: true, failedAt: null }),
      capture: (room: string) => { captured.push(room); return true; }, failure: vi.fn() } };
}
const rooms = ['W1N1', 'W2N1', 'W3N1'];
const budget = { scans: 3, attempts: 1 };

test('one shared attempt rotates fairly across reset, duplicate names and a changed visible set', () => {
  const fixture = setup();
  captureIntelCycle([...rooms].reverse().concat('W1N1'), 10, budget, fixture.ports, () => true);
  fixture.reset();
  fixture.ports.progress = createCaptureProgressStore(fixture.state);
  captureIntelCycle(rooms, 11, budget, fixture.ports, () => true);
  captureIntelCycle(['W1N1','W3N1'], 12, budget, fixture.ports, () => true);
  captureIntelCycle(rooms, 13, budget, fixture.ports, () => true);
  expect(fixture.captured).toEqual(['W1N1','W2N1','W3N1','W1N1']);
});

test('scan cap includes disabled and fresh rooms while stale detail triggers refresh', () => {
  const fixture = setup();
  fixture.ports.policy = () => ({ enabled: false, interval: 10 });
  const latest = vi.spyOn(fixture.ports, 'latest');
  expect(captureIntelCycle(rooms, 10, { scans: 1, attempts: 3 }, fixture.ports, () => true)).toMatchObject({ scanned: 1, attempted: 0 });
  expect(latest).not.toHaveBeenCalled();
  fixture.ports.policy = () => ({ enabled: true, interval: 10 });
  fixture.ports.latest = () => ({ seen: 9, stale: false, failedAt: null });
  expect(captureIntelCycle(rooms, 10, budget, fixture.ports, () => true).attempted).toBe(0);
  fixture.ports.latest = () => ({ seen: 9, stale: true, failedAt: null });
  captureIntelCycle(rooms, 11, budget, fixture.ports, () => true);
  expect(fixture.captured).toEqual(['W2N1']);
});

test('failed and hidden capture attempts consume the cap and cannot starve other rooms', () => {
  const fixture = setup();
  fixture.ports.capture = room => { if (room === 'W1N1') throw new Error('lost API'); return false; };
  fixture.ports.failure.mockImplementation(() => { throw new Error('broken sink'); });
  const first = captureIntelCycle(rooms, 10, budget, fixture.ports, () => true);
  expect(first).toMatchObject({ attempted: 1, captured: 0, failures: [{ room: 'W1N1' }] });
  const next = captureIntelCycle(rooms, 11, budget, fixture.ports, () => true);
  expect(next).toMatchObject({ attempted: 1, captured: 0, failures: [] });
  expect(fixture.ports.progress.read().cursor).toBe('W2N1');
});

test('failure cooldown and ordinary interval use exact tick boundaries', () => {
  const fixture = setup();
  fixture.ports.latest = () => ({ seen: 5, stale: true, failedAt: 9 });
  expect(captureIntelCycle(rooms, 18, budget, fixture.ports, () => true).attempted).toBe(0);
  expect(captureIntelCycle(rooms, 19, budget, fixture.ports, () => true).attempted).toBe(1);
  fixture.ports.latest = () => ({ seen: 19, stale: false, failedAt: null });
  expect(captureIntelCycle(rooms, 28, budget, fixture.ports, () => true).attempted).toBe(0);
  expect(captureIntelCycle(rooms, 29, budget, fixture.ports, () => true).attempted).toBe(1);
});

test('zero budgets and initial CPU refusal touch no progress or metadata', () => {
  const fixture = setup(), read = vi.spyOn(fixture.ports.progress, 'read');
  captureIntelCycle(rooms, 10, { scans: 0, attempts: 1 }, fixture.ports, () => true);
  captureIntelCycle(rooms, 10, { scans: 3, attempts: 0 }, fixture.ports, () => true);
  captureIntelCycle(rooms, 10, budget, fixture.ports, () => false);
  expect(read).not.toHaveBeenCalled();
  expect(fixture.state.read('intel-capture/empire')).toBeUndefined();
});

test('CPU refusal after metadata retains the pending room for a later tick', () => {
  const fixture = setup();
  let available = true;
  fixture.ports.latest = () => { available = false; return { seen: null, stale: true, failedAt: null }; };
  const result = captureIntelCycle(rooms, 10, budget, fixture.ports, () => available);
  expect(result).toMatchObject({ scanned: 1, attempted: 0 });
  expect(fixture.state.read('intel-capture/empire')).toBeUndefined();
  expect(fixture.captured).toEqual([]);
});

test('progress CAS rejects stale writers, avoids unchanged writes and preserves foreign ownership', () => {
  const fixture = setup(), store = fixture.ports.progress;
  expect(store.read()).toEqual({ revision: 0, cursor: null });
  expect(store.save(0, 'W1N1')).toBe(true);
  const write = vi.spyOn(fixture.state, 'write');
  expect(store.save(1, 'W1N1')).toBe(true);
  expect(write).not.toHaveBeenCalled();
  expect(store.save(0, 'W2N1')).toBe(false);
  expect(store.read()).toEqual({ revision: 1, cursor: 'W1N1' });
  fixture.state.write('intel-capture/empire', { owner: 'other', version: 1, data: {} });
  expect(() => store.read()).toThrow('owner');
  expect(() => store.save(1, 'W2N1')).toThrow('owner');
});

test('invalid clocks, budgets and malformed topology cannot silently capture', () => {
  const fixture = setup();
  expect(() => captureIntelCycle(rooms, -1, budget, fixture.ports, () => true)).toThrow('clock');
  expect(() => captureIntelCycle(rooms, 10, { scans: 1.5, attempts: 1 }, fixture.ports, () => true)).toThrow('budget');
  expect(() => captureIntelCycle(['sim'], 10, budget, fixture.ports, () => true)).toThrow();
  fixture.ports.latest = () => ({ seen: 11, stale: false, failedAt: null });
  expect(captureIntelCycle(rooms, 10, budget, fixture.ports, () => true).failures).toHaveLength(3);
  expect(fixture.captured).toEqual([]);
});
