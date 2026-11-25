import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createStartupPlanningJob } from '../../src/features/remotes/startup/planning/runner';
import { createStartupSchedulePlanner } from '../../src/features/remotes/startup/schedules/runner';
import { forecastStartupProject } from '../../src/capabilities/economy/startup/project';
import { startupPassiveProject } from '../fixtures/startup-passive-project';
interface Proof { root: { eldrift?: unknown }; savedAt: number; resumedAt?: number; readOnly?: boolean; through?: number; planningVersion?: number; scheduleVersion?: number; result?: ReturnType<typeof forecastStartupProject>; uninterrupted?: ReturnType<typeof forecastStartupProject> }
interface ProbeMemory extends Memory { startupPassiveMigration?: Proof }
/** Compatible synthetic v5/v2 records, not archived bytes produced by an old deployed bundle. */
export function probeStartupPassiveMigration(): void {
  const memory = Memory as ProbeMemory;
  if (Game.time === 149) memory.startupPassiveMigration = { root: {},savedAt: Game.time };
  const proof = memory.startupPassiveMigration;
  if (!proof) throw new Error('Missing passive migration seed');
  const state = createMemoryPort(() => proof.root), home = 'W0N1', input = startupPassiveProject(), spawning = input.project.spawning;
  spawning.room = home; spawning.requests = spawning.requests.map(request => ({ ...request,room: home })); spawning.spawns = spawning.spawns.map(spawn => ({ ...spawn,room: home }));
  const query = { room: 'E0N1',source: 'passive-migration',generation: 1,binding: 'passive-migration',observedAt: 149,expiresAt: 249,tick: Game.time,input };
  const planning = createStartupPlanningJob(state,home), schedule = createStartupSchedulePlanner(state,home);
  if (Game.time === 149) {
    schedule.advance(query,{ frames: 21,extensions: 0 });
    state.write('remoteStartupPlanning/'+home,{ owner: 'remotes',version: 5,data: planning.read() });
    state.write('remoteStartupSchedules/'+home,{ owner: 'remotes',version: 2,data: schedule.read() });
    return;
  }
  const before = JSON.stringify(proof.root), recovered = planning.read(); schedule.read();
  proof.readOnly = JSON.stringify(proof.root) === before;
  if (recovered.job?.checkpoint.tick !== 21 || !proof.readOnly) throw new Error('Passive migration lost progress or wrote during read');
  const resumed = planning.advance({ ...query,expectedRevision: recovered.revision },80);
  schedule.advance(query,{ frames: 1,extensions: 0 });
  if (resumed.status !== 'complete') throw new Error('Passive migration did not complete');
  const envelope = (key: string) => state.read(key+'/'+home) as { version: number };
  Object.assign(proof,{ resumedAt: Game.time,through: resumed.through,planningVersion: envelope('remoteStartupPlanning').version,
    scheduleVersion: envelope('remoteStartupSchedules').version,result: resumed.result,uninterrupted: forecastStartupProject(input) });
}
