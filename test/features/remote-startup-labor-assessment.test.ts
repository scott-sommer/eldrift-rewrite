import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createStartupPlanningJob } from '../../src/features/remotes/startup/planning/runner';
import { createStartupCandidateCatalog } from '../../src/features/remotes/startup/candidates/catalog';
import { startupLaborProject } from '../fixtures/startup-labor-project';
import { forecastStartupProject } from '../../src/capabilities/economy/startup/project';
import { assessStartupProject } from '../../src/capabilities/economy/startup/assessment';
import { chooseStartupProject } from '../../src/capabilities/economy/startup/choice';
const policy = { minimumRecoveryMargin: 0,minimumDeliveredEnergy: 1,maximumRecoveryTicks: 100,maximumHouseholdCapital: 1000 };
function fixture() {
  const input = startupLaborProject(), home = 'W0N1', spawning = input.project.spawning;
  spawning.room = home; spawning.requests = spawning.requests.map(request => ({ ...request,room: home })); spawning.spawns = spawning.spawns.map(spawn => ({ ...spawn,room: home }));
  const root = {}, state = createMemoryPort(() => root);
  return { input,root,state,planner: createStartupPlanningJob(state,home),catalog: createStartupCandidateCatalog(state,home),
    query: { room: 'E0N1',source: 'labor-source',generation: 1,binding: 'required-work',observedAt: 1,expiresAt: 100,tick: 1,input } };
}
test('completed productive work permits excess load to return and is not a labor rejection',() => {
  const f = fixture(); f.planner.advance({ ...f.query,expectedRevision: 0 },101);
  expect(f.planner.assess(f.query,policy)?.rejected).not.toContain('labor-work');
});
test('a paid worker that misses its pickup cannot satisfy work or survive as accepted cached evidence',() => {
  const f = fixture(); f.input.household!.labor!.jobs = [{ ...f.input.household!.labor!.jobs[0]!,pickupAt: 0 }];
  f.planner.advance({ ...f.query,expectedRevision: 0 },101);
  expect(f.planner.result(f.query)?.spawning.births.some(birth => birth.request === 'home-worker')).toBe(true);
  expect(f.planner.assess(f.query,policy)?.rejected).toContain('labor-work');
  expect(f.catalog.capture('work',f.query,policy,0)).toBe('saved');
  const reset = JSON.parse(JSON.stringify(f.root)), catalog = createStartupCandidateCatalog(createMemoryPort(() => reset),'W0N1');
  expect(catalog.lookup('work',f.query,policy)?.rejected).toContain('labor-work');
});
test('portable assessment and alternative choice require requested spend and settled cargo',() => {
  const f = fixture(), result = forecastStartupProject(f.input), requiredLabor = f.input.household!.labor!.jobs;
  expect(assessStartupProject(result,100,policy,[],requiredLabor).rejected).not.toContain('labor-work');
  const alternative = { id: 'work',result,requiredBirths: [],requiredLabor };
  requiredLabor[0]!.energy = 11;
  // Two upgrade opportunities still consume two; loading more cannot invent required work.
  expect(assessStartupProject(result,100,policy,[],requiredLabor).rejected).not.toContain('labor-work');
  requiredLabor[0]!.workTicks = 3;
  expect(chooseStartupProject([alternative],100,policy,'final-return').assessments[0]!.rejected).toContain('labor-work');
});
