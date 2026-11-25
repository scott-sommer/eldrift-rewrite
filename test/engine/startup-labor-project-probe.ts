import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createStartupPlanningJob } from '../../src/features/remotes/startup/planning/runner';
import { forecastStartupProject } from '../../src/capabilities/economy/startup/project';
import { startupLaborProject } from '../fixtures/startup-labor-project';
interface Proof {
  kind: 'build' | 'upgrade'; root: { eldrift?: unknown }; savedAt: number;
  resumedAt?: number; recoveredThrough?: number; through?: number; readOnly?: boolean;
  result?: ReturnType<typeof forecastStartupProject>; uninterrupted?: ReturnType<typeof forecastStartupProject>;
}
interface ProbeMemory extends Memory { startupLaborProjects?: Proof[] }
/** Native Memory/reset execution of synthetic paid-work forecasts; no real labor actor is implied. */
export function probeStartupLaborProjects(): void {
  const memory = Memory as ProbeMemory;
  if (Game.time === 149) memory.startupLaborProjects = (['build','upgrade'] as const).map(kind => ({ kind,root: {},savedAt: Game.time }));
  if (!memory.startupLaborProjects) throw new Error('Missing labor project seeds');
  for (const proof of memory.startupLaborProjects) advance(proof);
}
function advance(proof: Proof): void {
  const home = 'W0N1',input = startupLaborProject(proof.kind), spawning = input.project.spawning;
  spawning.room = home; spawning.requests = spawning.requests.map(request => ({ ...request,room: home })); spawning.spawns = spawning.spawns.map(spawn => ({ ...spawn,room: home }));
  const owner = createStartupPlanningJob(createMemoryPort(() => proof.root),home);
  const query = { room: 'E0N1',source: 'labor-'+proof.kind,generation: 1,binding: 'labor-'+proof.kind,observedAt: 149,expiresAt: 249,tick: Game.time,input };
  if (Game.time === 149) { owner.advance({ ...query,expectedRevision: 0 },13); return; }
  const before = JSON.stringify(proof.root), recovered = owner.read(); proof.readOnly = before === JSON.stringify(proof.root);
  if (!recovered.job || recovered.job.checkpoint.tick !== 13 || !proof.readOnly) throw new Error('Labor checkpoint failed read-only reset');
  const result = owner.advance({ ...query,expectedRevision: recovered.revision },88);
  if (result.status !== 'complete') throw new Error('Labor project did not complete after reset');
  Object.assign(proof,{ resumedAt: Game.time,recoveredThrough: recovered.job.checkpoint.tick,through: result.through,result: result.result,uninterrupted: forecastStartupProject(input) });
}
