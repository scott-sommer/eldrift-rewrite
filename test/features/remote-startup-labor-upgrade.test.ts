import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { peekState } from '../../src/persistence/versioned-state';
import { createStartupPlanningJob } from '../../src/features/remotes/startup/planning/runner';
import { createStartupSchedulePlanner } from '../../src/features/remotes/startup/schedules/runner';
import { createStartupCandidateCatalog } from '../../src/features/remotes/startup/candidates/catalog';
import { createStartupCandidateStore } from '../../src/features/remotes/startup/candidates/store';
import { startupLaborProject } from '../fixtures/startup-labor-project';
import { startupOutsideProject } from '../fixtures/startup-outside-project';
function fixture(labor: boolean) {
  const root = {},state = createMemoryPort(() => root), input = labor ? startupLaborProject() : startupOutsideProject(),home = 'W0N1',spawning = input.project.spawning;
  spawning.room = home; spawning.requests = spawning.requests.map(request => ({ ...request,room: home })); spawning.spawns = spawning.spawns.map(spawn => ({ ...spawn,room: home }));
  return { root,state,home,query: { room: 'E0N1',source: 'source',generation: 1,binding: 'labor',observedAt: 1,expiresAt: 100,tick: 1,input },owner: createStartupPlanningJob(state,home) };
}
function old(version: number) { return { owner: 'remotes',version,migrations: {},initial: () => null,valid: (value: unknown): value is null => value !== undefined }; }
test('planning6 preserves compatible work without writing and labor-aware7 refuses old labels/readers',() => {
  const f = fixture(false); f.owner.advance({ ...f.query,expectedRevision: 0 },21); const record = f.owner.read(); f.state.write('remoteStartupPlanning/W0N1',{ owner: 'remotes',version: 6,data: record });
  const before = JSON.stringify(f.root); expect(f.owner.read()).toEqual(record); expect(JSON.stringify(f.root)).toBe(before);
  f.owner.advance({ ...f.query,tick: 2,expectedRevision: 1 },1); expect(() => peekState(f.state,'remoteStartupPlanning/W0N1',old(6))).toThrow('future');
  const next = fixture(true); next.owner.advance({ ...next.query,expectedRevision: 0 },21); const saved = next.owner.read();
  next.state.write('remoteStartupPlanning/W0N1',{ owner: 'remotes',version: 6,data: saved }); expect(() => next.owner.read()).toThrow('schema6');
});
test('schedule3 migrates lazily while labor-aware4 retains its project checkpoint through reset',() => {
  const f = fixture(false),owner = createStartupSchedulePlanner(f.state,f.home); owner.advance(f.query,{ frames: 21,extensions: 0 }); const record = owner.read();
  f.state.write('remoteStartupSchedules/W0N1',{ owner: 'remotes',version: 3,data: record }); const before = JSON.stringify(f.root); expect(owner.read()).toEqual(record); expect(JSON.stringify(f.root)).toBe(before);
  owner.advance({ ...f.query,tick: 2 },{ frames: 1,extensions: 0 }); expect(() => peekState(f.state,'remoteStartupSchedules/W0N1',old(3))).toThrow('future');
  const next = fixture(true),future = createStartupSchedulePlanner(next.state,next.home); future.advance(next.query,{ frames: 13,extensions: 0 });
  const reset = JSON.parse(JSON.stringify(next.root)),restored = createStartupSchedulePlanner(createMemoryPort(() => reset),next.home);
  expect(restored.advance({ ...next.query,tick: 2 },{ frames: 1,extensions: 0 })).toMatchObject({ status: 'deferred',frames: 1 });
  next.state.write('remoteStartupSchedules/W0N1',{ owner: 'remotes',version: 3,data: future.read() }); expect(() => future.read()).toThrow('schema3');
});
test.each([false,true])('cache3 retains only non-labor derived identities and recaptures under4 (labor=%s)',labor => {
  const f = fixture(labor),catalog = createStartupCandidateCatalog(f.state,f.home),store = createStartupCandidateStore(f.state,f.home);
  const policy = { minimumRecoveryMargin: 0,minimumDeliveredEnergy: 1,maximumRecoveryTicks: 100,maximumHouseholdCapital: 1000 };
  f.owner.advance({ ...f.query,expectedRevision: 0 },101); expect(catalog.capture('a',f.query,policy,0)).toBe('saved'); const record = store.read();
  f.state.write('remoteStartupCandidates/W0N1',{ owner: 'remotes',version: 3,data: record }); const before = JSON.stringify(f.root); expect(store.read().entries).toHaveLength(labor ? 0 : 1); expect(JSON.stringify(f.root)).toBe(before);
  expect(catalog.capture('a',f.query,policy,record.revision)).toBe('saved'); expect(() => peekState(f.state,'remoteStartupCandidates/W0N1',old(3))).toThrow('future');
});
