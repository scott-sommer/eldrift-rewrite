import { afterEach, expect, test, vi } from 'vitest';
import { createNativeGroundDelivery } from '../../src/app/native-ground-delivery';
import { createActionArbiter } from '../../src/core/execution/action-arbiter';
import type { createNativeDispatch } from '../../src/app/native-dispatch';
import { createGroundJournal } from '../../src/features/logistics/ground-journal';
import type { Envelope } from '../../src/persistence/versioned-state';
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  for (const [key, value] of Object.entries({ Game: { time: 1 }, LOOK_RESOURCES: 'resource', OK: 0, ERR_BUSY: -4, ERR_INVALID_ARGS: -10 })) vi.stubGlobal(key, value);
  const records = new Map<string, Envelope>();
  const state = { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => { records.set(key, structuredClone(value)); } };
  const arbiter = createActionArbiter(() => 1);
  const dispatch = { arbiter } as ReturnType<typeof createNativeDispatch>;
  const drop = vi.fn(() => 0);
  const creep = { id: 'id', name: 'hauler', my: true, spawning: false, hits: 100, drop,
    pos: { roomName: 'E0N1', x: 20, y: 21, lookFor: () => [] }, store: { getUsedCapacity: () => 50 } } as unknown as Creep;
  return { state, dispatch, creep, drop, delivery: createNativeGroundDelivery(state, dispatch) };
}
test('native drop persists before invocation and excludes work and movement for the tick', () => {
  const f = fixture();
  f.drop.mockImplementation(() => {
    expect(createGroundJournal(f.state, 'id').read().attempt?.id).toBe('release');
    return 0;
  });
  expect(f.delivery.issue(f.creep, 'owner', 'release', 'energy', 50).status).toBe('issued');
  expect(f.dispatch.arbiter.issue('hauler', 'owner', ['primary-work'], () => 0, () => true).status).toBe('blocked');
  expect(f.dispatch.arbiter.issue('hauler', 'owner', ['move'], () => 0, () => true).status).toBe('blocked');
  expect(createNativeGroundDelivery(f.state, { arbiter: createActionArbiter(() => 1) } as ReturnType<typeof createNativeDispatch>)
    .issue(f.creep, 'owner', 'duplicate', 'energy', 50).status).toBe('blocked');
  expect(f.drop).toHaveBeenCalledTimes(1);
});
test('an existing action conflict does not create a pending ground journal attempt', () => {
  const f = fixture();
  f.dispatch.arbiter.issue('hauler', 'owner', ['transfer'], () => 0, () => true);
  expect(f.delivery.issue(f.creep, 'owner', 'release', 'energy', 50).status).toBe('blocked');
  expect(createGroundJournal(f.state, 'id').read().attempt).toBeNull();
  expect(f.drop).not.toHaveBeenCalled();
});
test('a throwing native call retains the attempt and prevents a reconstructed retry', () => {
  const f = fixture();
  f.drop.mockImplementation(() => { throw new Error('engine failure'); });
  expect(() => f.delivery.issue(f.creep, 'owner', 'release', 'energy', 50)).toThrow('engine failure');
  expect(createGroundJournal(f.state, 'id').begin({ id: 'retry', unit: 'id', resource: 'energy', tick: 2,
    position: { room: 'E0N1', x: 20, y: 21 }, amount: 50, cargoBefore: 50, hitsBefore: 100, groundBefore: 0 })).toBe(false);
});

test('a definitive native rejection is recorded without delivery and allows retry only on a later tick', () => {
  const f = fixture();
  f.drop.mockReturnValue(-6);
  expect(f.delivery.issue(f.creep, 'owner', 'release', 'energy', 50)).toEqual({ status: 'rejected', code: -6 });
  expect(createGroundJournal(f.state, 'id').read()).toMatchObject({ acknowledged: true, result: { status: 'rejected', code: -6 } });
  expect(f.delivery.issue(f.creep, 'owner', 'same-tick', 'energy', 50).status).toBe('blocked');
  expect(() => createGroundJournal(f.state, 'id').acknowledge('release')).toThrow();
  vi.stubGlobal('Game', { time: 2 });
  f.drop.mockReturnValue(0);
  expect(createNativeGroundDelivery(f.state, { arbiter: createActionArbiter(() => 2) } as ReturnType<typeof createNativeDispatch>)
    .issue(f.creep, 'owner', 'retry', 'energy', 50).status).toBe('issued');
  expect(createGroundJournal(f.state, 'id').read()).toMatchObject({ acknowledged: false, result: null, attempt: { id: 'retry', tick: 2 } });
});
