import { startupHouseholdProject } from '../fixtures/startup-household-project';
import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createStartupPlanningJob } from '../../src/features/remotes/startup/planning/runner';
import { createStartupProject, restoreStartupProject, forecastStartupProject } from '../../src/capabilities/economy/startup/project';
import { peekState } from '../../src/persistence/versioned-state';
import { startupDeliveryInput } from '../fixtures/startup-delivery';
import { startupInitialInput } from '../fixtures/startup-initial';
import { legacyStartupCheckpoint } from '../fixtures/startup-legacy-checkpoint';
function fixture() {
  const root = {}, state = createMemoryPort(() => root), home = 'W0N1', input = startupDeliveryInput();
  input.project.spawning.room = home; input.project.spawning.requests = input.project.spawning.requests.map(request => ({ ...request,room: home }));
  input.project.spawning.spawns = input.project.spawning.spawns.map(spawn => ({ ...spawn,room: home }));
  const query = { room: 'E0N1',source: 'source',generation: 1,binding: 'fixture',observedAt: 1,expiresAt: 100,tick: 1,input };
  const owner = createStartupPlanningJob(state,home); owner.advance({ ...query,expectedRevision: 0 },43); const current = owner.read();
  const legacy = { ...current,job: { ...current.job!,checkpoint: legacyStartupCheckpoint(input,current.job!.checkpoint) } };
  state.write('remoteStartupPlanning/W0N1',{ owner: 'remotes',version: 1,data: legacy });
  state.write('fixture/unrelated',{ owner: 'fixture',version: 1,data: { keep: 42 } }); return { root,state,owner,query,legacy };
}
test('format1 checkpoint resumes exact pending settlement and exports format2 without replay',() => {
  const input = startupDeliveryInput(), project = createStartupProject(input); project.advance(43);
  const resumed = restoreStartupProject(input,legacyStartupCheckpoint(input,project.checkpoint()));
  expect(resumed.advance(0)).toMatchObject({ through: 43,frames: 0 }); expect(resumed.checkpoint().format).toBe(2);
  resumed.advance(58); expect(resumed.result()).toEqual(forecastStartupProject(input));
});
test('schema1 job migration is read-only until a successful write preserves revision, receipts and unrelated state',() => {
  const f = fixture(), before = JSON.stringify(f.root); expect(f.owner.read().job?.checkpoint.format).toBe(2); expect(JSON.stringify(f.root)).toBe(before);
  const result = f.owner.advance({ ...f.query,tick: 2,expectedRevision: 1 },58); expect(result.status).toBe('complete');
  expect(f.owner.read()).toMatchObject({ revision: 2,clock: 2,job: { checkpoint: { format: 2,tick: 101 } } });
  expect(f.state.read('remoteStartupPlanning/W0N1')).toMatchObject({ version: 7 }); expect(f.state.read('fixture/unrelated')).toMatchObject({ data: { keep: 42 } });
  expect(f.owner.result({ ...f.query,tick: 2 })).toEqual(forecastStartupProject(f.query.input));
});
test('schema1 readers refuse new jobs and legacy records containing formerly unsupported metadata are rejected',() => {
  const f = fixture(); f.owner.advance({ ...f.query,tick: 2,expectedRevision: 1 },1);
  const oldSchema = { owner: 'remotes',version: 1,migrations: {},initial: () => null,valid: (value: unknown): value is null => value !== undefined };
  expect(() => peekState(f.state,'remoteStartupPlanning/W0N1',oldSchema)).toThrow('future');
  const initial = startupInitialInput().initial!;
  f.state.write('remoteStartupPlanning/W0N1',{ owner: 'remotes',version: 1,data: { ...f.legacy,job: { ...f.legacy.job,input: { ...f.legacy.job.input,initial } } } });
  const before = JSON.stringify(f.root); expect(() => f.owner.read()).toThrow('legacy'); expect(JSON.stringify(f.root)).toBe(before);
});
test('format1 cannot smuggle new initial inventory semantics or opening-state metadata',() => {
  const input = startupDeliveryInput(), project = createStartupProject(input), old = legacyStartupCheckpoint(input,project.checkpoint()) as Record<string,unknown>;
  expect(() => restoreStartupProject(startupInitialInput(),old)).toThrow('checkpoint');
  old.opening = project.checkpoint().opening; expect(() => restoreStartupProject(input,old)).toThrow('checkpoint');
});

test('new incumbent inventory and construction credit survive the feature-owned input codec and job reset',() => {
  const root = {}, state = createMemoryPort(() => root), input = startupInitialInput();
  input.project.spawning.room = 'W0N1'; input.project.spawning.spawns = [{ id: 'spawn',room: 'W0N1',availableAt: 0 }];
  input.project.remainingProgress = 4; input.project.spawning.cash.selfHarvestedConstruction = 4;
  input.initial!.miner = { id: 'paid',body: ['work','carry','move'],availableAt: 0,expiresAt: 10,remainingSpawnTicks: 0,retireTicks: 0,energy: 8 };
  const query = { room: 'E0N1',source: 'source',generation: 1,binding: 'incumbent',observedAt: 1,expiresAt: 100,tick: 1,input };
  const owner = createStartupPlanningJob(state,'W0N1'); owner.advance({ ...query,expectedRevision: 0 },1);
  expect(owner.read().job?.checkpoint.opening.constructionEnergyFromOpening).toBe(4);
  const memory = JSON.parse(JSON.stringify(root)), resumed = createStartupPlanningJob(createMemoryPort(() => memory),'W0N1');
  const result = resumed.advance({ ...query,tick: 2,expectedRevision: 1 },20);
  expect(result).toMatchObject({ status: 'complete',frames: 20,result: { spawning: { births: [] },openingAssets: { energy: 8,constructionEnergyFromOpening: 4 } } });
  expect(resumed.result({ ...query,tick: 2 })).toEqual(forecastStartupProject(input));
});

test('schema2 old-input jobs migrate read-only with pending receipts and write schema6 on progress',() => {
  const f = fixture(); const record = f.owner.read(); f.state.write('remoteStartupPlanning/W0N1',{ owner: 'remotes',version: 2,data: record });
  const before = JSON.stringify(f.root); expect(f.owner.read().job?.checkpoint.due).toHaveLength(1); expect(JSON.stringify(f.root)).toBe(before);
  f.owner.advance({ ...f.query,tick: 2,expectedRevision: 1 },1);
  expect(f.state.read('remoteStartupPlanning/W0N1')).toMatchObject({ version: 7 });
});
test('household format3 jobs survive reset; schema2 labels and old readers cannot consume them',() => {
  const root = {}, state = createMemoryPort(() => root), input = startupHouseholdProject(), home = 'W0N1';
  input.project.spawning.room = home; input.project.spawning.requests = input.project.spawning.requests.map(request => ({ ...request,room: home })); input.project.spawning.spawns = input.project.spawning.spawns.map(spawn => ({ ...spawn,room: home }));
  const query = { room: 'E0N1',source: 'source',generation: 1,binding: 'household',observedAt: 1,expiresAt: 100,tick: 1,input }, owner = createStartupPlanningJob(state,home);
  owner.advance({ ...query,expectedRevision: 0 },7); expect(owner.read().job?.checkpoint.format).toBe(3);
  const memory = JSON.parse(JSON.stringify(root)), resumed = createStartupPlanningJob(createMemoryPort(() => memory),home); expect(resumed.result(query)).toBeUndefined();
  const completed = resumed.advance({ ...query,tick: 2,expectedRevision: 1 },94); expect(completed).toMatchObject({ status: 'complete',result: { cash: { birthEnergy: 400 } } });
  expect(resumed.result({ ...query,tick: 2 })).toEqual(forecastStartupProject(input));
  const oldSchema = { owner: 'remotes',version: 2,migrations: {},initial: () => null,valid: (value: unknown): value is null => value !== undefined };
  expect(() => peekState(state,'remoteStartupPlanning/W0N1',oldSchema)).toThrow('future');
  const record = owner.read(); state.write('remoteStartupPlanning/W0N1',{ owner: 'remotes',version: 2,data: record }); const before = JSON.stringify(root);
  expect(() => owner.read()).toThrow('schema2'); expect(JSON.stringify(root)).toBe(before);
});
