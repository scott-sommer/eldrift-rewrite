import { expect, test, vi } from 'vitest';
import { createIntelTraversal } from '../../src/features/intel/traversal';
import type { IntelTraversalPolicy } from '../../src/features/intel/traversal-model';
import type { IntelRoomStatus, RoomSummary } from '../../src/features/intel/model';
import { createIntelStore } from '../../src/features/intel/store';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { pathableRoomGap } from '../../src/capabilities/intel/room-gap';
import { intelSummary } from '../fixtures/intel-summary';
function policy(patch: Partial<IntelTraversalPolicy> = {}): IntelTraversalPolicy {
  return { mode: 'known-safe', username: 'bot', allies: ['ally'], blockedRooms: [], avoidUntil: {},
    allowKeeper: false, maximumAge: 2, maximumRooms: 64, unknownCost: 8, staleCost: 4, keeperCost: 25, ...patch };
}
function summary(tick = 10, room = 'W1N1'): RoomSummary {
  return { ...intelSummary(tick, room), units: [], structures: [] };
}
function setup(tick = 10) {
  const memory = {}, state = createMemoryPort(() => memory), store = createIntelStore(state);
  const ports = { intel: vi.fn((room: string) => store.peek(room, tick).record), status: vi.fn((): IntelRoomStatus => 'normal') };
  return { state, store, ports, traversal: (patch: Partial<IntelTraversalPolicy> = {}, guard = () => true) =>
    createIntelTraversal(ports, policy(patch), tick, guard) };
}

test('unknown rooms are uncertain exploration opportunities and never certified safe', () => {
  const fixture = setup();
  expect(fixture.traversal().assess('W1N1')).toEqual({ status: 'blocked', reason: 'unknown', refresh: true });
  expect(fixture.traversal({ mode: 'exploration' }).assess('W1N1')).toEqual({ status: 'allowed', confidence: 'uncertain', cost: 8, refresh: true });
  expect(fixture.state.read('intel/W1N1')).toBeUndefined();
});

test('expiry boundaries and ID-only updates cannot make retained detail safe', () => {
  const fixture = setup(12);
  fixture.store.observeSummary(summary());
  expect(fixture.traversal().assess('W1N1')).toMatchObject({ status: 'allowed', confidence: 'known', refresh: false });
  const expired = createIntelTraversal(fixture.ports, policy(), 13);
  expect(expired.assess('W1N1')).toEqual({ status: 'blocked', reason: 'stale', refresh: true });
  fixture.store.observe('W1N1', { lastSeen: 12, owned: true, sourceIds: ['source'], structureIds: [], hostileIds: [] });
  expect(fixture.traversal().assess('W1N1')).toMatchObject({ status: 'blocked', reason: 'stale' });
  expect(fixture.traversal({ mode: 'exploration' }).assess('W1N1')).toMatchObject({ confidence: 'uncertain', cost: 4 });
});

test('owner/reservation changes and hostile units block both safe routing and exploration', () => {
  for (const kind of ['owner','reservation','unit','tower','core']) {
    const fixture = setup(), facts = summary();
    if (kind === 'owner') facts.controller = { ...facts.controller!, owned: false, owner: 'enemy' };
    if (kind === 'reservation') facts.controller = { ...facts.controller!, level: 0, owned: false, owner: null,
      reservation: { username: 'enemy', ticksToEnd: 10 } };
    if (kind === 'unit') facts.units = [{ id: 'unit', x: 20, y: 21, owner: 'enemy', owned: false, power: false }];
    if (kind === 'tower' || kind === 'core') facts.structures = [{ id: 'threat', x: 21, y: 21,
      type: kind === 'core' ? 'invaderCore' : 'tower', owner: 'enemy', owned: false, hostile: true }];
    fixture.store.observeSummary(facts);
    expect(fixture.traversal({ mode: 'exploration' }).assess('W1N1')).toMatchObject({ status: 'blocked', reason: 'hostile' });
  }
});

test('allies and passive NPC structures do not inherit raw hostile-index semantics', () => {
  const fixture = setup(), facts = summary();
  facts.controller = { ...facts.controller!, owned: false, owner: 'ally' };
  facts.units = [{ id: 'ally-unit', x: 20, y: 21, owner: 'ally', owned: false, power: true }];
  facts.structures = [{ id: 'bank', x: 21, y: 21, type: 'powerBank', owner: null, owned: false, hostile: true },
    { id: 'ally-tower', x: 22, y: 21, type: 'tower', owner: 'ally', owned: false, hostile: true }];
  fixture.store.observeSummary(facts);
  expect(fixture.store.peek('W1N1', 10).record.hostileIds).toHaveLength(3);
  expect(fixture.traversal().assess('W1N1')).toMatchObject({ status: 'allowed', confidence: 'known' });
});

test('unclassified legacy threats and newer unknown hostile IDs require refresh', () => {
  const fixture = setup();
  fixture.store.observe('W1N1', { lastSeen: 1, owned: false, sourceIds: [], structureIds: [], hostileIds: ['unknown'] });
  expect(fixture.traversal({ mode: 'exploration' }).assess('W1N1')).toMatchObject({ reason: 'unclassified-threat', refresh: true });
  fixture.store.observeSummary(summary(2));
  fixture.store.observe('W1N1', { lastSeen: 3, owned: true, sourceIds: ['source'], structureIds: [], hostileIds: ['new-unit'] });
  expect(fixture.traversal({ mode: 'exploration' }).assess('W1N1')).toMatchObject({ reason: 'unclassified-threat' });
});

test('stale known danger remains blocked until a new authoritative observation clears it', () => {
  const fixture = setup(20), facts = summary(1);
  facts.units = [{ id: 'enemy', x: 20, y: 21, owner: 'enemy', owned: false, power: false }];
  fixture.store.observeSummary(facts);
  const request = fixture.traversal({ mode: 'exploration' });
  expect(request.assess('W1N1')).toMatchObject({ reason: 'hostile' });
  fixture.store.observeSummary(summary(20));
  expect(request.assess('W1N1')).toMatchObject({ reason: 'hostile' });
  expect(fixture.traversal().assess('W1N1')).toMatchObject({ confidence: 'known', refresh: false });
});

test.each(['closed','novice','respawn','unknown'] as const)('current %s map status blocks destinations before intel reads', status => {
  const fixture = setup();
  fixture.ports.status.mockReturnValue(status);
  const traversal = fixture.traversal({ mode: 'exploration' });
  expect(traversal.cost('W1N1')).toBe(Infinity);
  expect(traversal.assess('W1N1')).toEqual({ status: 'blocked', reason: 'status', refresh: true });
  expect(fixture.ports.intel).not.toHaveBeenCalled();
});

test('current normal map status supersedes historical status; explicit keeper policy controls risk', () => {
  const fixture = setup();
  fixture.store.observeSummary({ ...summary(), status: 'novice', statusTimestamp: 123 });
  expect(fixture.traversal().allows('W1N1')).toBe(true);
  expect(fixture.traversal({ mode: 'exploration' }).assess('E4S4')).toMatchObject({ reason: 'keeper' });
  expect(fixture.traversal({ mode: 'exploration', allowKeeper: true }).assess('E4S4'))
    .toMatchObject({ confidence: 'uncertain', cost: 33, refresh: true });
});

test('temporary exclusions expire exactly and caller mutation cannot rewrite a request policy', () => {
  const fixture = setup(), input = policy({ mode: 'exploration', blockedRooms: ['W2N1'], avoidUntil: { W1N1: 11, W3N1: 10 } });
  const traversal = createIntelTraversal(fixture.ports, input, 10);
  (input.blockedRooms as string[]).length = 0;
  (input.avoidUntil as Record<string, number>).W1N1 = 0;
  expect(traversal.assess('W2N1')).toMatchObject({ reason: 'excluded' });
  expect(traversal.assess('W1N1')).toMatchObject({ reason: 'temporary' });
  expect(traversal.allows('W3N1')).toBe(true);
  expect(fixture.ports.intel.mock.calls.map(call => call[0])).toEqual(['W3N1']);
});

test('guard, request room budget and corrupt facts fail conservatively without unlimited reads', () => {
  const fixture = setup();
  expect(fixture.traversal({}, () => false).assess('W1N1')).toMatchObject({ reason: 'admission' });
  expect(fixture.traversal({ maximumRooms: 0 }).assess('W1N1')).toMatchObject({ reason: 'room-budget' });
  expect(fixture.ports.status).not.toHaveBeenCalled();
  const traversal = fixture.traversal({ mode: 'exploration', maximumRooms: 1 });
  expect(traversal.allows('W1N1')).toBe(true);
  expect(traversal.cost('W1N1')).toBe(8);
  expect(traversal.assess('W2N1')).toMatchObject({ reason: 'room-budget' });
  expect(fixture.ports.intel).toHaveBeenCalledTimes(1);
  fixture.ports.intel.mockImplementation(() => { throw new Error('corrupt'); });
  const failed = fixture.traversal({ maximumRooms: 1 });
  expect(() => failed.assess('W3N1')).toThrow('corrupt');
  expect(failed.assess('W3N1')).toMatchObject({ reason: 'room-budget' });
});

test('real-corner graph routing excludes hostile intermediates and blocked target exemptions', () => {
  const fixture = setup();
  for (const room of ['E0S0','E1S0','E0S1','E1S1']) fixture.store.observeSummary(summary(10, room));
  fixture.store.observeSummary({ ...summary(10, 'E1S0'), controller: { ...summary().controller!, owned: false, owner: 'enemy' } });
  const rooms: Record<string, string[]> = { E0S0: ['E1S0','E0S1'], E1S0: ['E1S1'], E0S1: ['E1S1'], E1S1: [] };
  const traversal = fixture.traversal(), graph = { exits: (room: string) => rooms[room], allows: traversal.allows };
  expect(pathableRoomGap('E0S0','E1S1',graph,{ depth: 4, reads: 16 })).toMatchObject({
    status: 'found', gap: 1, route: ['E0S0','E0S1','E1S1'], exact: true });
  const blocked = fixture.traversal({ blockedRooms: ['E1S1'] });
  expect(pathableRoomGap('E0S0','E1S1',{ ...graph, allows: blocked.allows },{ depth: 4, reads: 16 }))
    .toMatchObject({ status: 'unavailable', reason: 'blocked-destination' });
});

test('invalid policy and future/wrong-room facts cannot certify traversal', () => {
  const fixture = setup();
  for (const patch of [{ maximumRooms: 10001 }, { maximumAge: -1 }, { unknownCost: 0 }, { username: '' },
    { avoidUntil: { W1N1: -1 } }, { blockedRooms: ['sim'] }]) expect(() => fixture.traversal(patch)).toThrow();
  fixture.store.observeSummary(summary(11));
  expect(() => fixture.traversal().assess('W1N1')).toThrow('clock');
  fixture.store.observeSummary(summary(10, 'W2N1'));
  fixture.ports.intel.mockImplementation(() => fixture.store.peek('W2N1', 10).record);
  expect(() => fixture.traversal().assess('W1N1')).toThrow('Invalid traversal intel');
});

test('detached intel ports retain fresh request risk, schema validation, status and budget gates',() => {
  const f = setup(); f.store.observeSummary(summary());
  const ports = { ...f.ports,detachedReads: true as const };
  const first = createIntelTraversal(ports,policy(),10); expect(first.allows('W1N1')).toBe(true);
  f.store.observeSummary({ ...summary(),controller: { ...summary().controller!,owned: false,owner: 'enemy' } });
  expect(createIntelTraversal(ports,policy(),10).assess('W1N1')).toMatchObject({ reason: 'hostile' });
  expect(first.allows('W1N1')).toBe(true); // Existing request remains its own bounded assessment.
  const bad = f.store.peek('W1N1',10).record; bad.sourceIds = ['duplicate','duplicate'];
  f.ports.intel.mockReturnValue(bad);
  expect(() => createIntelTraversal(ports,policy(),10).assess('W1N1')).toThrow('Invalid traversal intel');
  f.ports.status.mockReturnValue('closed');
  expect(createIntelTraversal(ports,policy(),10).assess('W1N1')).toMatchObject({ reason: 'status' });
  expect(createIntelTraversal(ports,policy(),10,() => false).assess('W1N1')).toMatchObject({ reason: 'admission' });
});
