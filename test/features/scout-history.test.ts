import { expect, test } from 'vitest';
import { createScoutHistoryStore } from '../../src/features/intel/scout-store';
import { createScoutRetirement } from '../../src/features/intel/scout-retirement';
import { scoutDangerRooms } from '../../src/features/intel/scout-danger';
import { createIntelStore } from '../../src/features/intel/store';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import type { ScoutHeartbeat } from '../../src/features/intel/scout-model';
import type { StatePort } from '../../src/persistence/versioned-state';
import { intelSummary } from '../fixtures/intel-summary';
function heartbeat(id = 'unit', patch: Partial<ScoutHeartbeat> = {}): ScoutHeartbeat {
  return { id, name: id, home: 'W1N1', position: { room: 'W2N1', x: 20, y: 21 }, seenAt: 10,
    expiresAt: 100, target: 'W3N1', ...patch };
}
function setup() {
  let memory = {};
  const state = createMemoryPort(() => memory);
  return { state, store: createScoutHistoryStore(state), memory: () => memory,
    reset: () => { memory = JSON.parse(JSON.stringify(memory)); } };
}

test('missing reads/unknown retirement remain read-only; heartbeats are detached and replay-idempotent', () => {
  const fixture = setup();
  expect(fixture.store.read().active).toEqual([]);
  expect(fixture.store.retire('absent', 10)).toBeUndefined();
  expect(fixture.memory()).toEqual({});
  const facts = heartbeat();
  fixture.store.heartbeat(facts);
  fixture.store.heartbeat(facts);
  expect(fixture.store.read().revision).toBe(1);
  facts.position.x = 1;
  expect(fixture.store.read().active[0]!.position.x).toBe(20);
  fixture.reset();
  expect(createScoutHistoryStore(fixture.state).read().active[0]!.position.room).toBe('W2N1');
});

test('early loss records last actual position/time and cannot erase observed room facts', () => {
  const fixture = setup(), intel = createIntelStore(fixture.state);
  intel.observeSummary(intelSummary(10, 'W2N1'), true);
  fixture.store.heartbeat(heartbeat());
  fixture.state.write('missions/keep', { owner: 'missions', version: 1, data: { sentinel: 17 } });
  const retire = createScoutRetirement(fixture.state, () => 11);
  retire('unit'); retire('unit');
  expect(fixture.store.read()).toMatchObject({ active: [], losses: [{ id: 'unit', detectedAt: 11,
    seenAt: 10, position: { room: 'W2N1' }, kind: 'early-disappearance', failurePending: false }] });
  expect(fixture.store.read().losses).toHaveLength(1);
  expect(intel.peek('W2N1', 11)).toMatchObject({ record: { lastSeen: 10, lastVisit: 10,
    lastFailure: { id: 'scout-loss:unit', tick: 11, reason: 'early-disappearance' }, summary: { sources: [{ id: 'source' }] } } });
  expect(fixture.state.read('missions/keep')).toMatchObject({ data: { sentinel: 17 } });
});

test('exact lifetime boundary and missing lifetime do not create false early-loss penalties', () => {
  const fixture = setup();
  fixture.store.heartbeat(heartbeat('expiry', { expiresAt: 11 }));
  fixture.store.heartbeat(heartbeat('unknown', { expiresAt: null }));
  const retire = createScoutRetirement(fixture.state, () => 11);
  retire('expiry'); retire('unknown');
  expect(fixture.store.read().losses.map(loss => loss.kind)).toEqual(['expired','unknown']);
  expect(fixture.state.read('intel/W2N1')).toBeUndefined();
  expect(scoutDangerRooms('W1N1', fixture.store.read(), 11, { window: 5000, minimumLosses: 1 })).toEqual([]);
});

test.each(['intel','acknowledge'])('interrupted %s delivery replays the original loss after reset', stage => {
  const fixture = setup();
  fixture.store.heartbeat(heartbeat());
  let failed = false;
  const port: StatePort = { read: key => fixture.state.read(key), write(key,value) {
    const data = value.data as { losses?: { failurePending: boolean }[] };
    const selected = stage === 'intel' ? key === 'intel/W2N1'
      : key === 'scouting/empire' && data.losses?.[0]?.failurePending === false;
    if (!failed && selected) { failed = true; throw new Error('interrupted'); }
    fixture.state.write(key,value);
  } };
  expect(() => createScoutRetirement(port, () => 11)('unit')).toThrow('interrupted');
  expect(fixture.store.read().losses[0]).toMatchObject({ detectedAt: 11, failurePending: true });
  fixture.reset();
  createScoutRetirement(port, () => 20)('unit');
  expect(fixture.store.read().losses).toMatchObject([{ detectedAt: 11, failurePending: false }]);
  expect(createIntelStore(fixture.state).peek('W2N1', 20).record.lastFailure?.tick).toBe(11);
});

test('home and global history limits retain pending reports without unbounded completed history', () => {
  const fixture = setup();
  for (let index = 0; index < 23; index++) {
    fixture.store.heartbeat(heartbeat(`unit-${index}`));
    createScoutRetirement(fixture.state, () => 11)(`unit-${index}`);
  }
  expect(fixture.store.read().losses).toHaveLength(20);
  expect(fixture.store.read().losses[0]!.id).toBe('unit-3');
  fixture.store.heartbeat(heartbeat('pending'));
  fixture.store.retire('pending', 12);
  expect(fixture.store.read().losses.some(loss => loss.id === 'pending' && loss.failurePending)).toBe(true);
});

test('danger counts early losses by home/room and expires when fewer than the threshold remain', () => {
  const fixture = setup();
  for (const [id,tick] of [['a',11],['b',12],['c',13]] as const) {
    fixture.store.heartbeat(heartbeat(id));
    createScoutRetirement(fixture.state, () => tick)(id);
  }
  const policy = { window: 5, minimumLosses: 2 };
  expect(scoutDangerRooms('W1N1', fixture.store.read(), 16, policy)).toEqual([{ room: 'W2N1', count: 3, until: 18 }]);
  expect(scoutDangerRooms('W1N1', fixture.store.read(), 17, policy)).toEqual([{ room: 'W2N1', count: 2, until: 18 }]);
  expect(scoutDangerRooms('W1N1', fixture.store.read(), 18, policy)).toEqual([]);
  expect(scoutDangerRooms('W9N9', fixture.store.read(), 16, policy)).toEqual([]);
});

test('invalid/conflicting/retired identities and reversed clocks preserve authoritative state', () => {
  const fixture = setup();
  fixture.store.heartbeat(heartbeat());
  const before = JSON.stringify(fixture.memory());
  expect(() => fixture.store.heartbeat(heartbeat('x'.repeat(241)))).toThrow('Invalid');
  expect(() => fixture.store.heartbeat(heartbeat('unit', { seenAt: 9 }))).toThrow('reversed');
  expect(() => fixture.store.heartbeat(heartbeat('unit', { home: 'W2N2' }))).toThrow('home');
  expect(() => fixture.store.retire('unit', 9)).toThrow('reversed');
  expect(JSON.stringify(fixture.memory())).toBe(before);
  createScoutRetirement(fixture.state, () => 11)('unit');
  expect(() => fixture.store.heartbeat(heartbeat())).toThrow('Retired');
  fixture.state.write('scouting/empire', { owner: 'other', version: 1, data: {} });
  const corrupt = JSON.stringify(fixture.memory());
  expect(() => fixture.store.read()).toThrow('owner');
  expect(JSON.stringify(fixture.memory())).toBe(corrupt);
});


test('observed presence after predicted expiry remains active until complete-roster disappearance', () => {
  const fixture = setup();
  fixture.store.heartbeat(heartbeat('present', { seenAt: 20, expiresAt: 19 }));
  expect(fixture.store.read().active).toHaveLength(1);
  expect(fixture.store.retire('present', 21)).toMatchObject({ kind: 'expired', expiresAt: 19, seenAt: 20 });
});


test('global completed-history cap keeps the newest reports across many homes', () => {
  const fixture = setup();
  const losses = Array.from({ length: 513 }, (_, index) => ({ ...heartbeat(`closed-${index}`, { home: `W${index}N1` }),
    detectedAt: 11, kind: 'early-disappearance', failurePending: false }));
  fixture.state.write('scouting/empire', { owner: 'scouting', version: 1, data: { revision: 1, active: [], losses } });
  fixture.store.heartbeat(heartbeat('latest', { home: 'W999N1' }));
  createScoutRetirement(fixture.state, () => 12)('latest');
  expect(fixture.store.read().losses).toHaveLength(512);
  expect(fixture.store.read().losses[0]!.id).toBe('closed-2');
  expect(fixture.store.read().losses.at(-1)!.id).toBe('latest');
});
