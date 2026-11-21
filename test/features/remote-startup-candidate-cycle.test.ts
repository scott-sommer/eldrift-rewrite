import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createStartupPlanningJob } from '../../src/features/remotes/startup/planning/runner';
import { createStartupCandidateCatalog } from '../../src/features/remotes/startup/candidates/catalog';
import { createStartupCandidateCycle } from '../../src/features/remotes/startup/candidates/cycle';
import { startupDeliveryInput } from '../fixtures/startup-delivery';
const policy = { minimumRecoveryMargin: 0,minimumDeliveredEnergy: 1,maximumRecoveryTicks: 1000,maximumHouseholdCapital: 1000 };
function fixture() {
  const root = {}, state = createMemoryPort(() => root), home = 'W0N1', input = startupDeliveryInput();
  input.project.spawning.room = home;
  input.project.spawning.requests = input.project.spawning.requests.map(request => ({ ...request,room: home }));
  input.project.spawning.spawns = input.project.spawning.spawns.map(spawn => ({ ...spawn,room: home }));
  input.project.spawning.cash.horizon = 1000; input.project.source.energy = 1000; input.project.source.capacity = 1000;
  const query = { room: 'E0N1',source: 'source',generation: 1,binding: 'context',observedAt: 1,expiresAt: 100,tick: 1,input };
  return { root,state,home,candidates: [{ id: 'a',query },{ id: 'b',query: { ...query,source: 'other',binding: 'other' } }],cycle: createStartupCandidateCycle(state,home),catalog: createStartupCandidateCatalog(state,home),planner: createStartupPlanningJob(state,home) };
}
test('one aggregate frame budget advances two candidates and resumes the second across JSON reset',() => {
  const f = fixture();
  expect(f.cycle.advance(f.candidates,policy,'final-return',{ frames: 1200,candidates: 2 })).toMatchObject({ status: 'deferred',reason: 'budget',frames: 1200,processed: 2 });
  expect(f.catalog.read().entries.map(entry => entry.id)).toEqual(['a']); expect(f.planner.read().job?.checkpoint.tick).toBe(199);
  const root = JSON.parse(JSON.stringify(f.root)), state = createMemoryPort(() => root), cycle = createStartupCandidateCycle(state,f.home);
  const candidates = f.candidates.map(item => ({ ...item,query: { ...item.query,tick: 2 } }));
  expect(cycle.advance(candidates,policy,'final-return',{ frames: 802,candidates: 1 })).toMatchObject({ status: 'complete',selected: 'a',frames: 802,processed: 1 });
  const before = JSON.stringify(root);
  expect(cycle.advance(candidates,policy,'payback',{ frames: 0,candidates: 0 })).toMatchObject({ status: 'complete',selected: 'a',frames: 0,processed: 0 }); expect(JSON.stringify(root)).toBe(before);
});
test('candidate budget stops after capture without opening a second scratch job',() => {
  const f = fixture(); expect(f.cycle.advance(f.candidates,policy,'payback',{ frames: 10001,candidates: 1 })).toMatchObject({ status: 'deferred',reason: 'budget',frames: 1001,processed: 1 });
  expect(f.planner.read().job?.source).toBe('source'); expect(f.catalog.lookup('b',f.candidates[1]!.query,policy)).toBeUndefined();
});
test('zero admission or candidate budgets do not initialize state',() => {
  const f = fixture(); expect(f.cycle.advance(f.candidates,policy,'payback',{ frames: 100,candidates: 2 },() => false)).toMatchObject({ status: 'deferred',reason: 'admission',frames: 0 }); expect(f.root).toEqual({});
  expect(f.cycle.advance(f.candidates,policy,'payback',{ frames: 100,candidates: 0 })).toMatchObject({ status: 'deferred',reason: 'budget',frames: 0 }); expect(f.root).toEqual({});
});
test('a saved complete scratch result can be captured with zero new simulation frames',() => {
  const f = fixture(); f.planner.advance({ ...f.candidates[0]!.query,expectedRevision: 0 },1001);
  expect(f.cycle.advance(f.candidates.slice(0,1),policy,'payback',{ frames: 0,candidates: 1 })).toMatchObject({ status: 'complete',frames: 0,processed: 1 });
});
test('changed inputs replace stale evidence and cannot expose a previously complete winner',() => {
  const f = fixture(); f.cycle.advance(f.candidates,policy,'payback',{ frames: 2002,candidates: 2 });
  f.candidates[0]!.query.input.project.source.energy = 0;
  expect(f.cycle.advance(f.candidates,policy,'payback',{ frames: 10,candidates: 2 })).toMatchObject({ status: 'deferred',frames: 10 });
  expect(f.planner.read().job?.checkpoint.tick).toBe(10);
});
test('guard mutation cannot change detached candidate inputs or policy during computation',() => {
  const f = fixture(), ownPolicy = { ...policy }; let calls = 0;
  f.cycle.advance(f.candidates.slice(0,1),ownPolicy,'payback',{ frames: 1001,candidates: 1 },() => {
    if (++calls === 1) { f.candidates[0]!.query.input.project.source.energy = 0; ownPolicy.minimumRecoveryMargin = 99999; } return true;
  });
  expect(f.catalog.read().entries[0]?.assessment.accepted).toBe(true);
});
test('expired observations defer without creating a forecast or candidate record',() => {
  const f = fixture(), candidates = f.candidates.map(item => ({ ...item,query: { ...item.query,tick: 101 } }));
  expect(f.cycle.advance(candidates,policy,'payback',{ frames: 1001,candidates: 2 })).toMatchObject({ status: 'deferred',reason: 'expired',frames: 0 }); expect(f.root).toEqual({});
});
test('invalid budgets and duplicate candidates are refused before durable publication',() => {
  const f = fixture(); for (const frames of [-1,NaN,Infinity,10002]) expect(() => f.cycle.advance(f.candidates,policy,'payback',{ frames,candidates: 1 })).toThrow('budget');
  expect(() => f.cycle.advance([f.candidates[0]!,f.candidates[0]!],policy,'payback',{ frames: 1001,candidates: 2 })).toThrow('choice'); expect(f.root).toEqual({});
});

test('catalog capacity refusal is propagated without dropping prior completed evidence',() => {
  const f = fixture(), candidate = f.candidates[0]!;
  f.planner.advance({ ...candidate.query,expectedRevision: 0 },1001);
  for (let i = 0; i < 16; i++) f.catalog.capture(String(i),candidate.query,policy,i);
  const before = JSON.stringify(f.catalog.read());
  expect(f.cycle.advance([candidate],policy,'payback',{ frames: 0,candidates: 1 })).toMatchObject({ status: 'deferred',reason: 'capacity',frames: 0,processed: 1 });
  expect(JSON.stringify(f.catalog.read())).toBe(before);
});
test('guard exhaustion after completion preserves the scratch result for later zero-frame capture',() => {
  const f = fixture(), candidates = f.candidates.slice(0,1); let calls = 0;
  const first = f.cycle.advance(candidates,policy,'payback',{ frames: 1001,candidates: 1 },() => ++calls <= 1004);
  expect(first).toMatchObject({ status: 'deferred',reason: 'admission',frames: 1001,processed: 1 });
  expect(f.catalog.read().entries).toEqual([]); expect(f.planner.read().job?.checkpoint.tick).toBe(1001);
  expect(f.cycle.advance(candidates,policy,'payback',{ frames: 0,candidates: 1 })).toMatchObject({ status: 'complete',frames: 0,processed: 1 });
});
