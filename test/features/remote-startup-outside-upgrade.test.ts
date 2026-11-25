import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { peekState } from '../../src/persistence/versioned-state';
import { createStartupPlanningJob } from '../../src/features/remotes/startup/planning/runner';
import { createStartupSchedulePlanner } from '../../src/features/remotes/startup/schedules/runner';
import { createStartupCandidateCatalog } from '../../src/features/remotes/startup/candidates/catalog';
import { createStartupCandidateStore } from '../../src/features/remotes/startup/candidates/store';
import { startupOutsideProject } from '../fixtures/startup-outside-project';
import { startupPassiveProject } from '../fixtures/startup-passive-project';
function fixture(outside = true) {
  const root = {},state = createMemoryPort(() => root), input = outside ? startupOutsideProject() : startupPassiveProject(),home = 'W0N1',spawning = input.project.spawning;
  spawning.room = home; spawning.requests = spawning.requests.map(request => ({ ...request,room: home })); spawning.spawns = spawning.spawns.map(spawn => ({ ...spawn,room: home }));
  const query = { room: 'E0N1',source: 'source',generation: 1,binding: 'outside',observedAt: 1,expiresAt: 100,tick: 1,input };
  return { root,state,query,home,owner: createStartupPlanningJob(state,home) };
}
function old(version: number) { return { owner: 'remotes',version,migrations: {},initial: () => null,valid: (value: unknown): value is null => value !== undefined }; }
test('planning5 without located costs preserves progress read-only and writes7 after progress',() => {
  const f = fixture(false); f.owner.advance({ ...f.query,expectedRevision: 0 },21); const data = f.owner.read(); f.state.write('remoteStartupPlanning/W0N1',{ owner: 'remotes',version: 5,data });
  const before = JSON.stringify(f.root); expect(f.owner.read()).toEqual(data); expect(JSON.stringify(f.root)).toBe(before);
  f.owner.advance({ ...f.query,tick: 2,expectedRevision: 1 },1); expect(f.state.read('remoteStartupPlanning/W0N1')).toMatchObject({ version: 7,data: { job: { checkpoint: { tick: 22,format: 5 } } } });
});
test('current planning reset resumes located expense counters and old5 readers/labels refuse',() => {
  const f = fixture(); f.owner.advance({ ...f.query,expectedRevision: 0 },21); const root = JSON.parse(JSON.stringify(f.root)),state = createMemoryPort(() => root), owner = createStartupPlanningJob(state,f.home);
  expect(() => peekState(state,'remoteStartupPlanning/W0N1',old(5))).toThrow('future');
  expect(owner.advance({ ...f.query,tick: 2,expectedRevision: 1 },80)).toMatchObject({ status: 'complete',through: 101 });
  const data = f.owner.read(); data.job!.checkpoint.format = 5; f.state.write('remoteStartupPlanning/W0N1',{ owner: 'remotes',version: 5,data }); expect(() => f.owner.read()).toThrow('schema5');
});
test('schedule2 seeds migrate without writes and old2 labels cannot carry located expenses',() => {
  const f = fixture(false),owner = createStartupSchedulePlanner(f.state,f.home); owner.advance(f.query,{ frames: 21,extensions: 0 }); const data = owner.read();
  f.state.write('remoteStartupSchedules/W0N1',{ owner: 'remotes',version: 2,data }); const before = JSON.stringify(f.root); expect(owner.read()).toEqual(data); expect(JSON.stringify(f.root)).toBe(before);
  owner.advance({ ...f.query,tick: 2 },{ frames: 1,extensions: 0 }); expect(() => peekState(f.state,'remoteStartupSchedules/W0N1',old(2))).toThrow('future');
  const next = fixture(),future = createStartupSchedulePlanner(next.state,next.home); future.advance(next.query,{ frames: 21,extensions: 0 });
  next.state.write('remoteStartupSchedules/W0N1',{ owner: 'remotes',version: 2,data: future.read() }); expect(() => future.read()).toThrow('schema2');
});
test.each([false,true])('cache2 preserves compatible identities and drops located/unknown ones (located=%s)',located => {
  const f = fixture(located),catalog = createStartupCandidateCatalog(f.state,f.home),store = createStartupCandidateStore(f.state,f.home);
  const policy = { minimumRecoveryMargin: 0,minimumDeliveredEnergy: 1,maximumRecoveryTicks: 100,maximumHouseholdCapital: 1000 };
  f.owner.advance({ ...f.query,expectedRevision: 0 },101); expect(catalog.capture('a',f.query,policy,0)).toBe('saved'); const data = store.read();
  f.state.write('remoteStartupCandidates/W0N1',{ owner: 'remotes',version: 2,data }); const before = JSON.stringify(f.root); expect(store.read().entries).toHaveLength(located ? 0 : 1); expect(JSON.stringify(f.root)).toBe(before);
  expect(catalog.capture('a',f.query,policy,data.revision)).toBe('saved'); expect(() => peekState(f.state,'remoteStartupCandidates/W0N1',old(2))).toThrow('future');
});
