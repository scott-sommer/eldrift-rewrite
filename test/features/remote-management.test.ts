import { expect, test } from 'vitest';
import { managementFixture } from '../fixtures/remote-management';
import { createRemoteManagementStore } from '../../src/features/remotes/management/store';
const budget = { rooms: 1,sources: 1 };
test('source-bounded scans survive recreation and publish only a complete selected assignment', () => {
  const f = managementFixture();
  expect(f.manager().advance(f.request,budget,() => true).status).toBe('scanning');
  expect(f.ports.assess).toHaveBeenCalledTimes(1); expect(f.assignments.read().assignments).toEqual([]);
  expect(f.manager().read().sourceIndex).toBe(1);
  f.request.tick++; const result = f.manager().advance(f.request,budget,() => true);
  expect(result.status).toBe('applied'); expect(f.assignments.owner('E0N1',21)?.plan.sources).toHaveLength(2);
  expect(f.assignments.owner('E0N1',21)?.plan.reserve?.id).toBe('controller');
  const generation = f.assignments.owner('E0N1',21)!.generation;
  f.request.tick++; f.manager().advance(f.request,budget,() => true);
  expect(f.assignments.owner('E0N1',22)?.generation).toBe(generation); expect(f.ports.assess).toHaveBeenCalledTimes(2);
});
test('CPU admission failure does not consume a source or publish an empty replacement portfolio', () => {
  const f = managementFixture(), before = JSON.stringify(f.root);
  expect(f.manager().advance(f.request,budget,() => false).status).toBe('deferred'); expect(JSON.stringify(f.root)).toBe(before);
  f.ports.assess.mockReturnValueOnce({ status: 'deferred',id: 'source',reason: 'travel:admission',refresh: false } as never);
  expect(f.manager().advance(f.request,budget,() => true).status).toBe('scanning');
  expect(f.manager().read().sourceIndex).toBe(0); expect(f.manager().read().reports).toEqual([]);
  f.request.tick++; f.manager().advance(f.request,budget,() => true); expect(f.manager().read().sourceIndex).toBe(1);
});
test('policy changes discard mixed-policy draft quotes and backwards time cannot write', () => {
  const f = managementFixture(); f.manager().advance(f.request,budget,() => true);
  f.request.tick++; f.request.policy.portfolio.maximumSlots = 1;
  f.manager().advance(f.request,budget,() => true); expect(f.manager().read().sourceIndex).toBe(1);
  const before = JSON.stringify(f.root); f.request.tick--;
  expect(f.manager().advance(f.request,budget,() => true).status).toBe('stale'); expect(JSON.stringify(f.root)).toBe(before);
});
test('live admission drops unsafe managed leases, then re-acquires a fenced generation after recovery', () => {
  const f = managementFixture(); f.manager().advance(f.request,{ rooms: 1,sources: 2 },() => true);
  const old = f.assignments.owner('E0N1',20)!;
  f.request.tick++; f.ports.current.mockReturnValue(false); f.manager().advance(f.request,budget,() => true);
  expect(f.assignments.owner('E0N1',21)).toBeUndefined();
  f.request.tick++; f.ports.current.mockReturnValue(true); f.manager().advance(f.request,budget,() => true);
  expect(f.assignments.owner('E0N1',22)!.generation).toBeGreaterThan(old.generation);
});
test('manual same-home leases retain exact expiry and cannot be taken over by automatic selection', () => {
  const f = managementFixture();
  f.assignments.reconcile({ home: 'W0N1',tick: 20,lifetime: 5,expectedRevision: 0,plans: [{ room: 'E0N1',sources: ['operator-source'],reserve: null,infrastructure: null }] });
  const manual = f.assignments.owner('E0N1',20)!;
  f.manager().advance(f.request,{ rooms: 1,sources: 2 },() => true);
  expect(f.assignments.owner('E0N1',20)).toEqual(manual); expect(f.manager().read().managed).toEqual([]);
});
test('source inventory changes and concurrent job revisions cannot publish stale leases', () => {
  const f = managementFixture(); f.manager().advance(f.request,budget,() => true);
  f.request.tick++; f.summary.sources.pop();
  expect(f.manager().advance(f.request,budget,() => true).status).toBe('inventory-changed'); expect(f.assignments.read().assignments).toEqual([]);
  const g = managementFixture(); g.manager().advance(g.request,budget,() => true); g.request.tick++;
  g.ports.current.mockImplementation(() => {
    const store = createRemoteManagementStore(g.state,g.request.home), record = store.read(); store.save(record.revision,record); return true;
  });
  expect(g.manager().advance(g.request,budget,() => true).status).toBe('conflict'); expect(g.assignments.read().assignments).toEqual([]);
});

test('room inventory has its own budget and does not repeat earlier reads during source assessment', () => {
  const f = managementFixture();
  f.request.policy.candidates.push({ ...f.request.policy.candidates[0]!,room: 'E1N1' });
  const original = f.summary;
  f.ports.summary.mockImplementation((...args: unknown[]) => args[0] === 'E1N1' ? { ...original,room: 'E1N1',sources: [] } : original);
  expect(f.manager().advance(f.request,budget,() => true).status).toBe('scanning');
  expect(f.ports.summary).toHaveBeenCalledTimes(1); expect(f.ports.assess).not.toHaveBeenCalled();
  f.request.tick++;
  expect(f.manager().advance(f.request,budget,() => true).status).toBe('scanning'); expect(f.manager().read().roomIndex).toBe(2);
  expect(f.ports.summary).toHaveBeenCalledTimes(2); expect(f.ports.assess).toHaveBeenCalledTimes(1);
});

test('zero source capacity immediately revokes managed work without repeating source path searches', () => {
  const f = managementFixture(); f.manager().advance(f.request,{ rooms: 1,sources: 2 },() => true);
  expect(f.assignments.owner('E0N1',20)).toBeDefined(); const calls = f.ports.assess.mock.calls.length;
  f.request.tick++; f.request.policy.portfolio.maximumSlots = 0;
  expect(f.manager().advance(f.request,budget,() => true).status).toBe('applied');
  expect(f.assignments.owner('E0N1',21)).toBeUndefined(); expect(f.ports.assess).toHaveBeenCalledTimes(calls);
});
