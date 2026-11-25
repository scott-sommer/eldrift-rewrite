import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createStartupPlanningJob } from '../../src/features/remotes/startup/planning/runner';
import { peekState } from '../../src/persistence/versioned-state';
import { startupStructureProject } from '../fixtures/startup-structure-project';
import { startupHouseholdProject } from '../fixtures/startup-household-project';
function fixture(physical: boolean) {
  const root = {}, state = createMemoryPort(() => root), input = physical ? startupStructureProject() : startupHouseholdProject();
  const home = 'W0N1', spawning = input.project.spawning; spawning.room = home;
  spawning.requests = spawning.requests.map(request => ({ ...request,room: home })); spawning.spawns = spawning.spawns.map(spawn => ({ ...spawn,room: home }));
  const query = { room: 'E0N1',source: 'source',generation: 1,binding: 'physical',observedAt: 1,expiresAt: 100,tick: 1,input };
  const owner = createStartupPlanningJob(state,home); owner.advance({ ...query,expectedRevision: 0 },7);
  return { root,state,owner,query,home };
}
test('schema3 aggregate household migration is read-only and preserves in-flight cargo before schema4 progress',() => {
  const f = fixture(false), data = f.owner.read(); f.state.write('remoteStartupPlanning/W0N1',{ owner: 'remotes',version: 3,data });
  const before = JSON.stringify(f.root); expect(f.owner.read()).toEqual(data); expect(JSON.stringify(f.root)).toBe(before);
  expect(f.owner.read().job?.checkpoint.household!.redistribution.trips[0]!.cargo).toBe(50);
  f.owner.advance({ ...f.query,tick: 2,expectedRevision: 1 },1); expect(f.state.read('remoteStartupPlanning/W0N1')).toMatchObject({ version: 6,data: { revision: 2,job: { checkpoint: { tick: 8,format: 3 } } } });
});
test('schema4 physical planning survives JSON reset and schema3 readers refuse it without writes',() => {
  const f = fixture(true), root = JSON.parse(JSON.stringify(f.root)), state = createMemoryPort(() => root), owner = createStartupPlanningJob(state,f.home);
  expect(owner.read().job?.checkpoint.format).toBe(4); const before = JSON.stringify(root);
  const oldSchema = { owner: 'remotes',version: 3,migrations: {},initial: () => null,valid: (value: unknown): value is null => value !== undefined };
  expect(() => peekState(state,'remoteStartupPlanning/W0N1',oldSchema)).toThrow('future'); expect(JSON.stringify(root)).toBe(before);
  expect(owner.advance({ ...f.query,tick: 2,expectedRevision: 1 },94)).toMatchObject({ status: 'complete',frames: 94,through: 101 });
});
test('schema3 labels cannot smuggle physical input even with a relabeled aggregate project',() => {
  const f = fixture(true), data = f.owner.read(); data.job!.checkpoint.format = 3;
  f.state.write('remoteStartupPlanning/W0N1',{ owner: 'remotes',version: 3,data }); const before = JSON.stringify(f.root);
  expect(() => f.owner.read()).toThrow('schema3'); expect(JSON.stringify(f.root)).toBe(before);
});
