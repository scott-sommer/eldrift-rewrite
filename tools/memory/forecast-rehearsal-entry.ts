import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createStartupPlanningJob } from '../../src/features/remotes/startup/planning/runner';
import { createStartupSchedulePlanner } from '../../src/features/remotes/startup/schedules/runner';
import { createStartupCandidateCatalog } from '../../src/features/remotes/startup/candidates/catalog';
import { startupPassiveProject } from '../../test/fixtures/startup-passive-project';
const policy = { minimumRecoveryMargin: 0,minimumDeliveredEnergy: 1,maximumRecoveryTicks: 100,maximumHouseholdCapital: 1000 };
function owners(root: object, home: string, tick: number) {
  const state = createMemoryPort(() => root), input = startupPassiveProject(), spawning = input.project.spawning;
  spawning.room = home; spawning.requests = spawning.requests.map(request => ({ ...request,room: home })); spawning.spawns = spawning.spawns.map(spawn => ({ ...spawn,room: home }));
  const query = { room: 'E0N1',source: 'historical',generation: 1,binding: 'historical',observedAt: 1,expiresAt: 100,tick,input };
  return { query,planner: createStartupPlanningJob(state,home),schedule: createStartupSchedulePlanner(state,home),catalog: createStartupCandidateCatalog(state,home) };
}
export function seed(root = {}) {
  const partial = owners(root,'W0N1',1), cached = owners(root,'W1N1',1);
  partial.schedule.advance(partial.query,{ frames: 21,extensions: 0 });
  cached.planner.advance({ ...cached.query,expectedRevision: 0 },101);
  if (cached.catalog.capture('candidate',cached.query,policy,0) !== 'saved') throw new Error('Historical capture failed');
  return root;
}
export function inspect(root: object) {
  return ['W0N1','W1N1'].map(home => { const owner = owners(root,home,2); return { planning: owner.planner.read(),schedule: owner.schedule.read(),candidates: owner.catalog.read() }; });
}
export function resume(root: object) {
  const partial = owners(root,'W0N1',2), cached = owners(root,'W1N1',2), recovered = partial.planner.read();
  const result = partial.planner.advance({ ...partial.query,expectedRevision: recovered.revision },80);
  partial.schedule.advance(partial.query,{ frames: 1,extensions: 0 });
  if (cached.catalog.capture('candidate',cached.query,policy,cached.catalog.read().revision) !== 'saved') throw new Error('Resumed capture failed');
  return result;
}
