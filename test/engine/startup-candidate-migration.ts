import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createStartupPlanningJob } from '../../src/features/remotes/startup/planning/runner';
import { createStartupCandidateCatalog } from '../../src/features/remotes/startup/candidates/catalog';
import { createStartupCandidateStore } from '../../src/features/remotes/startup/candidates/store';
import { startupPassiveProject } from '../fixtures/startup-passive-project';
interface Proof { root: { eldrift?: unknown }; savedAt: number; resumedAt?: number; readOnly?: boolean; retained?: string[]; version?: number; revision?: number; lookup?: boolean; isolated?: boolean }
interface ProbeMemory extends Memory { startupCandidateMigration?: Proof }
/** Synthetic cache2 fixture includes compatible, located and unknown input identities. */
export function probeStartupCandidateMigration(): void {
  const memory = Memory as ProbeMemory;
  if (Game.time === 149) memory.startupCandidateMigration = { root: {},savedAt: Game.time };
  const proof = memory.startupCandidateMigration;
  if (!proof) throw new Error('Missing candidate migration seed');
  const state = createMemoryPort(() => proof.root), home = 'W0N1', input = startupPassiveProject(), spawning = input.project.spawning;
  spawning.room = home; spawning.requests = spawning.requests.map(request => ({ ...request,room: home })); spawning.spawns = spawning.spawns.map(spawn => ({ ...spawn,room: home }));
  const query = { room: 'E0N1',source: 'cache-migration',generation: 1,binding: 'cache-migration',observedAt: 149,expiresAt: 249,tick: Game.time,input };
  const policy = { minimumRecoveryMargin: 0,minimumDeliveredEnergy: 1,maximumRecoveryTicks: 100,maximumHouseholdCapital: 1000 };
  const catalog = createStartupCandidateCatalog(state,home), store = createStartupCandidateStore(state,home);
  if (Game.time === 149) {
    createStartupPlanningJob(state,home).advance({ ...query,expectedRevision: 0 },101);
    if (catalog.capture('compatible',query,policy,0) !== 'saved') throw new Error('Missing completed candidate evidence');
    const record = store.read(), entry = record.entries[0]!, located = JSON.parse(entry.inputIdentity);
    located.project.spawning.cash.flows.push({ id: 'located',kind: 'upkeep',spending: 'outside-spawn',energy: 1,firstTick: 20,interval: null,occurrences: 1 });
    state.write('remoteStartupCandidates/'+home,{ owner: 'remotes',version: 2,data: { ...record,entries: [entry,{ ...entry,id: 'located',inputIdentity: JSON.stringify(located) },{ ...entry,id: 'unknown',inputIdentity: '{}' }] } });
    state.write('migrationUnrelated/sentinel',{ owner: 'unrelated',version: 1,data: { sentinel: 'claims-queues-receipts-must-not-change' } });
    return;
  }
  const before = JSON.stringify(proof.root), sentinel = JSON.stringify(state.read('migrationUnrelated/sentinel')), record = store.read();
  proof.readOnly = JSON.stringify(proof.root) === before; proof.retained = record.entries.map(entry => entry.id);
  if (!proof.readOnly || proof.retained.join(',') !== 'compatible') throw new Error('Candidate migration failed isolation/filtering');
  if (catalog.capture('compatible',query,policy,record.revision) !== 'saved') throw new Error('Candidate migration recapture failed');
  const envelope = state.read('remoteStartupCandidates/'+home) as { version: number };
  Object.assign(proof,{ resumedAt: Game.time,version: envelope.version,revision: store.read().revision,
    lookup: !!catalog.lookup('compatible',query,policy),isolated: JSON.stringify(state.read('migrationUnrelated/sentinel')) === sentinel });
}
