import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { peekState } from '../../src/persistence/versioned-state';
import { createStartupPlanningJob } from '../../src/features/remotes/startup/planning/runner';
import { createStartupSchedulePlanner } from '../../src/features/remotes/startup/schedules/runner';
import { createStartupCandidateCatalog } from '../../src/features/remotes/startup/candidates/catalog';
import { createStartupCandidateStore } from '../../src/features/remotes/startup/candidates/store';
import { startupPassiveProject } from '../fixtures/startup-passive-project';
import { startupStructureProject } from '../fixtures/startup-structure-project';
function fixture(passive = true) {
  const root = {},state = createMemoryPort(() => root), input = passive ? startupPassiveProject() : startupStructureProject(), home = 'W0N1', spawning = input.project.spawning;
  spawning.room = home; spawning.requests = spawning.requests.map(request => ({ ...request,room: home })); spawning.spawns = spawning.spawns.map(spawn => ({ ...spawn,room: home }));
  const query = { room: 'E0N1',source: 'source',generation: 1,binding: 'passive',observedAt: 1,expiresAt: 100,tick: 1,input };
  return { root,state,query,home,owner: createStartupPlanningJob(state,home) };
}
function oldReader(version: number) { return { owner: 'remotes',version,migrations: {},initial: () => null,valid: (value: unknown): value is null => value !== undefined }; }
test('schema4 physical progress/cargo migrates read-only and writes5 only on progress',() => {
  const f = fixture(false); f.owner.advance({ ...f.query,expectedRevision: 0 },7); const data = f.owner.read();
  f.state.write('remoteStartupPlanning/W0N1',{ owner: 'remotes',version: 4,data }); const before = JSON.stringify(f.root);
  expect(f.owner.read()).toEqual(data); expect(JSON.stringify(f.root)).toBe(before);
  f.owner.advance({ ...f.query,tick: 2,expectedRevision: 1 },1); expect(f.state.read('remoteStartupPlanning/W0N1')).toMatchObject({ version: 6,data: { revision: 2,job: { checkpoint: { tick: 8,format: 4 } } } });
});
test('schema5 passive jobs resume and schema4 readers/labels cannot consume their new accounting',() => {
  const f = fixture(); f.owner.advance({ ...f.query,expectedRevision: 0 },7); expect(f.owner.read().job?.checkpoint.format).toBe(5);
  const root = JSON.parse(JSON.stringify(f.root)), state = createMemoryPort(() => root), owner = createStartupPlanningJob(state,f.home), before = JSON.stringify(root);
  expect(() => peekState(state,'remoteStartupPlanning/W0N1',oldReader(4))).toThrow('future'); expect(JSON.stringify(root)).toBe(before);
  expect(owner.advance({ ...f.query,tick: 2,expectedRevision: 1 },94)).toMatchObject({ status: 'complete',frames: 94,through: 101 });
  const data = f.owner.read(); data.job!.checkpoint.format = 4; f.state.write('remoteStartupPlanning/W0N1',{ owner: 'remotes',version: 4,data });
  expect(() => f.owner.read()).toThrow('schema4');
});
test('schedule1 preserves genuine non-passive seeds on read and schedule2 refuses old readers/passive relabels',() => {
  const f = fixture(false), schedules = createStartupSchedulePlanner(f.state,f.home); schedules.advance(f.query,{ frames: 7,extensions: 0 }); const data = schedules.read();
  f.state.write('remoteStartupSchedules/W0N1',{ owner: 'remotes',version: 1,data }); const before = JSON.stringify(f.root); expect(schedules.read()).toEqual(data); expect(JSON.stringify(f.root)).toBe(before);
  schedules.advance({ ...f.query,tick: 2 },{ frames: 1,extensions: 0 }); expect(f.state.read('remoteStartupSchedules/W0N1')).toMatchObject({ version: 3 });
  expect(() => peekState(f.state,'remoteStartupSchedules/W0N1',oldReader(1))).toThrow('future');
  const p = fixture(), passive = createStartupSchedulePlanner(p.state,p.home); passive.advance(p.query,{ frames: 7,extensions: 0 });
  p.state.write('remoteStartupSchedules/W0N1',{ owner: 'remotes',version: 1,data: passive.read() }); expect(() => passive.read()).toThrow('legacy');
});
test('candidate1 assessment cache is invalidated on detached read and recaptured under version2',() => {
  const f = fixture(), catalog = createStartupCandidateCatalog(f.state,f.home), store = createStartupCandidateStore(f.state,f.home);
  const policy = { minimumRecoveryMargin: 0,minimumDeliveredEnergy: 1,maximumRecoveryTicks: 100,maximumHouseholdCapital: 1000 };
  f.owner.advance({ ...f.query,expectedRevision: 0 },101); expect(catalog.capture('a',f.query,policy,0)).toBe('saved'); const old = store.read();
  f.state.write('remoteStartupCandidates/W0N1',{ owner: 'remotes',version: 1,data: old }); const before = JSON.stringify(f.root);
  expect(store.read().entries).toEqual([]); expect(catalog.lookup('a',f.query,policy)).toBeUndefined(); expect(JSON.stringify(f.root)).toBe(before);
  expect(catalog.capture('a',f.query,policy,old.revision)).toBe('saved'); expect(store.read().entries).toHaveLength(1);
  expect(() => peekState(f.state,'remoteStartupCandidates/W0N1',oldReader(1))).toThrow('future');
});
