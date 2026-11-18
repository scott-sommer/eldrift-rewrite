import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createRemoteAssignmentStore } from '../../src/features/remotes/assignment-store';
import { remoteAssignmentDemands } from '../../src/features/remotes/assignment-demand';
import { remoteAssignmentSchema } from '../../src/features/remotes/assignment-schema';
import type { RemoteAssignment, RemoteRoomPlan } from '../../src/features/remotes/assignment-model';
function plan(room = 'E0N1', sources = ['source-a']): RemoteRoomPlan {
  return { room,sources,reserve: { id: 'controller-' + room,position: { room,x: 25,y: 25 } },
    infrastructure: { roads: true,containers: true } };
}
function fixture() {
  const root: { eldrift?: unknown; unrelated: { sentinel: number } } = { unrelated: { sentinel: 42 } };
  const port = createMemoryPort(() => root);
  return { root,port,store: createRemoteAssignmentStore(port) };
}
function apply(store: ReturnType<typeof createRemoteAssignmentStore>, plans: RemoteRoomPlan[], home = 'W0N1', tick = 10, lifetime = 20) {
  return store.reconcile({ home,plans,tick,lifetime,expectedRevision: store.read().revision });
}
function assignment(store: ReturnType<typeof createRemoteAssignmentStore>): RemoteAssignment { return store.read().assignments[0]!; }

test('empty queries never initialize memory and invalid or stale batches cannot write', () => {
  const f = fixture(), before = JSON.stringify(f.root);
  expect(f.store.read().assignments).toEqual([]); expect(f.store.owner('E0N1',10)).toBeUndefined();
  expect(f.store.reconcile({ home: 'W0N1',tick: 10,lifetime: 20,plans: [plan()],expectedRevision: 1 })).toEqual({ status: 'stale',revision: 0 });
  expect(() => apply(f.store,[plan()],'W0N1',10,0)).toThrow('lifetime');
  expect(JSON.stringify(f.root)).toBe(before);
});

test('exclusive home conflicts reject the entire batch without dropping its previous assignments', () => {
  const f = fixture(); apply(f.store,[plan()]); apply(f.store,[plan('E1N1',['source-b'])],'W1N1');
  const before = JSON.stringify(f.root);
  expect(apply(f.store,[plan('E1N1',['source-b']),plan('E2N1',['source-c'])])).toEqual({ status: 'conflict',room: 'E1N1',home: 'W1N1' });
  expect(JSON.stringify(f.root)).toBe(before);
  expect(f.store.owner('E0N1',10)?.home).toBe('W0N1');
});

test('renewal retains generation while membership changes revoke previous mission authority', () => {
  const f = fixture(); apply(f.store,[plan()]); const first = assignment(f.store);
  apply(f.store,[plan()],'W0N1',20);
  const renewed = assignment(f.store);
  expect(renewed.generation).toBe(first.generation); expect(renewed.expiresAt).toBe(40);
  expect(f.store.permits(first.home,first.plan.room,first.generation,30)).toBe(true);
  apply(f.store,[plan('E0N1',['source-b'])],'W0N1',21);
  expect(assignment(f.store).generation).toBeGreaterThan(first.generation);
  expect(f.store.permits(first.home,first.plan.room,first.generation,21)).toBe(false);
});

test('expiry is exact, handoff changes generation, and old work remains fenced after JSON reset', () => {
  const f = fixture(); apply(f.store,[plan()]); const first = assignment(f.store);
  expect(f.store.owner('E0N1',29)?.home).toBe('W0N1'); expect(f.store.owner('E0N1',30)).toBeUndefined();
  const root = JSON.parse(JSON.stringify(f.root)), store = createRemoteAssignmentStore(createMemoryPort(() => root));
  expect(apply(store,[plan()],'W1N1',30)).toMatchObject({ status: 'applied' });
  expect(store.owner('E0N1',30)?.home).toBe('W1N1');
  expect(store.permits(first.home,first.plan.room,first.generation,30)).toBe(false);
  expect(store.owner('E0N1',30)?.generation).toBeGreaterThan(first.generation);
});

test('reconciliation drops only the requesting home, prunes expired leases and preserves unrelated state', () => {
  const f = fixture(); apply(f.store,[plan()]); apply(f.store,[plan('E1N1',['source-b'])],'W1N1',10,100);
  apply(f.store,[],'W0N1',11);
  expect(f.store.read().assignments.map(item => item.home)).toEqual(['W1N1']);
  expect(f.root.unrelated).toEqual({ sentinel: 42 });
  apply(f.store,[],'W2N1',110); expect(f.store.read().assignments).toEqual([]);
});

test('typed Mine Reserve Outpost demands have stable identities and detached payloads', () => {
  const f = fixture(); apply(f.store,[plan('E0N1',['source-b','source-a'])]);
  const first = assignment(f.store), demands = remoteAssignmentDemands(first,10);
  expect(demands.map(item => item.kind)).toEqual(['mine','mine','reserve','outpost']);
  expect(new Set(demands.map(item => item.id)).size).toBe(4);
  expect(demands.every(item => item.assignment === first.id && item.generation === first.generation)).toBe(true);
  const reserve = demands.find(item => item.kind === 'reserve')!; reserve.controller.position.x = 1;
  expect(first.plan.reserve?.position.x).toBe(25);
  apply(f.store,[plan('E0N1',['source-a','source-b'])],'W0N1',11);
  expect(remoteAssignmentDemands(assignment(f.store),11).map(item => item.id)).toEqual(demands.map(item => item.id));
  expect(assignment(f.store).generation).toBe(first.generation);
  expect(remoteAssignmentDemands(first,30)).toEqual([]); expect(remoteAssignmentDemands(first,9)).toEqual([]);
});

test('stale revision or backwards time cannot overwrite a newer home decision', () => {
  const f = fixture(); apply(f.store,[plan()]); const before = JSON.stringify(f.root);
  expect(f.store.reconcile({ home: 'W0N1',plans: [],tick: 11,lifetime: 20,expectedRevision: 0 })).toEqual({ status: 'stale',revision: 1 });
  expect(apply(f.store,[],'W0N1',9)).toEqual({ status: 'stale',revision: 1 });
  expect(f.store.owner('E0N1',9)).toBeUndefined(); expect(f.store.permits('W0N1','E0N1',1,9)).toBe(false);
  expect(JSON.stringify(f.root)).toBe(before);
});

test('source and room duplication, home targets and mismatched controller rooms cannot enter durable state', () => {
  const f = fixture(), before = JSON.stringify(f.root);
  expect(() => apply(f.store,[plan(),plan()])).toThrow('Conflicting');
  expect(() => apply(f.store,[plan('W0N1')])).toThrow('Conflicting');
  expect(() => apply(f.store,[plan(),plan('E1N1')])).toThrow('transition');
  const invalid = plan(); invalid.reserve!.position.room = 'E1N1';
  expect(() => apply(f.store,[invalid])).toThrow('plans');
  expect(JSON.stringify(f.root)).toBe(before);
});

test('bounded empire capacity refuses additions without evicting another home', () => {
  const f = fixture();
  const plans = (start: number) => Array.from({ length: 64 },(_,index) => plan('E' + (start + index) + 'N1',['source-' + (start + index)]));
  apply(f.store,plans(0)); apply(f.store,plans(64),'W1N1');
  const before = JSON.stringify(f.root);
  expect(apply(f.store,[plan('E128N1',['source-128'])],'W2N1')).toEqual({ status: 'capacity' });
  expect(JSON.stringify(f.root)).toBe(before);
});

test('corrupt persisted generations and duplicate room ownership fail schema validation', () => {
  const f = fixture(); apply(f.store,[plan()]); const state = f.store.read();
  expect(remoteAssignmentSchema.valid(state)).toBe(true);
  state.assignments[0]!.generation = 2; expect(remoteAssignmentSchema.valid(state)).toBe(false);
  state.assignments[0]!.generation = 1; state.assignments.push({ ...state.assignments[0]! });
  expect(remoteAssignmentSchema.valid(state)).toBe(false);
});

test('demand resolution uses current payload and refuses expired tokens even after same-generation renewal', () => {
  const f = fixture(); apply(f.store,[plan()]);
  const token = remoteAssignmentDemands(assignment(f.store),10).find(item => item.kind === 'reserve')!;
  token.controller.position.x = 1;
  expect(f.store.resolve(token,10)).toMatchObject({ kind: 'reserve',controller: { position: { x: 25 } } });
  apply(f.store,[plan()],'W0N1',20);
  expect(f.store.resolve(token,29)).toBeDefined(); expect(f.store.resolve(token,30)).toBeUndefined();
  const renewed = remoteAssignmentDemands(assignment(f.store),30)[0]!;
  expect(f.store.resolve(renewed,30)).toBeDefined();
  apply(f.store,[plan('E0N1',['source-b'])],'W0N1',31);
  expect(f.store.resolve(renewed,31)).toBeUndefined();
});

test('scoped batches preserve unmentioned same-home leases without renewing expiry or changing generation', () => {
  const f = fixture(); apply(f.store,[plan(),plan('E1N1',['manual'])]);
  const manual = f.store.owner('E1N1',10)!;
  expect(f.store.reconcile({ home: 'W0N1',tick: 11,lifetime: 100,expectedRevision: 1,scope: ['E0N1'],plans: [plan()] }).status).toBe('applied');
  expect(f.store.owner('E1N1',11)).toEqual(manual); expect(f.store.owner('E0N1',11)?.expiresAt).toBe(111);
  expect(f.store.reconcile({ home: 'W0N1',tick: 12,lifetime: 100,expectedRevision: 2,scope: ['E0N1'],plans: [] }).status).toBe('applied');
  expect(f.store.owner('E1N1',12)).toEqual(manual); expect(f.store.owner('E0N1',12)).toBeUndefined();
  const before = JSON.stringify(f.root);
  expect(() => f.store.reconcile({ home: 'W0N1',tick: 12,lifetime: 100,expectedRevision: 3,scope: [],plans: [plan()] })).toThrow('scope');
  expect(JSON.stringify(f.root)).toBe(before);
});
