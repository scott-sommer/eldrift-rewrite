import { openState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createNativeRemoteInfrastructure } from '../../src/app/remotes/infrastructure/native';
import { createConstructionReservationLedger } from '../../src/features/construction/reservation-ledger';
import { createConstructionProgressStore } from '../../src/features/construction/progress-store';
import { createRemoteAssignmentStore } from '../../src/features/remotes/assignment-store';
import { remoteAssignmentDemands } from '../../src/features/remotes/assignment-demand';
import { createRemoteInfrastructureStore } from '../../src/features/remotes/infrastructure/store';
import type { RemoteOutpostDemand } from '../../src/features/remotes/infrastructure/model';
const state = createMemoryPort(() => Memory), home = 'W0N1', remote = 'E0N1', assignments = createRemoteAssignmentStore(state);
const work = createNativeRemoteInfrastructure(state,createConstructionReservationLedger(),{ maximumRooms: 8,maximumOps: 10000,sourceSearches: 1,roomSites: 80,
  guard: () => true,policy: (_home,username) => ({ mode: 'known-safe',username,allies: [],blockedRooms: [],avoidUntil: {},allowKeeper: false,
    maximumAge: 20,maximumRooms: 64,unknownCost: 8,staleCost: 4,keeperCost: 25 }) });
interface ProbeMemory extends Memory { infrastructureRows?: unknown[]; infrastructureToken?: RemoteOutpostDemand }
export function loop(): void {
  const memory = Memory as ProbeMemory;
  if (Game.time === 1) {
    openState(state,'operator/config',operatorSchema);
    setAssignment(true,60);
    memory.infrastructureToken = demand()!;
    state.write('planning/W0N1',{ owner: 'planning',version: 3,data: { room: home,revision: 9,strategy: 'operator-sentinel',entries: [] } });
    createConstructionProgressStore(state,home).save(0,'owned-sentinel',3);
  }
  if (Game.time === 20) assignments.reconcile({ home,tick: Game.time,lifetime: 10,expectedRevision: assignments.read().revision,plans: [] });
  if (Game.time === 26) setAssignment(false,14);
  const active = demand(), token = memory.infrastructureToken!, stalePlan = Game.time >= 20 ? work.plan(home,token).status : 'current';
  const staleExecution = Game.time >= 20 ? work.run(home,token,{ rooms: 2,entries: 2,attempts: 1 }) : [];
  const planned = active ? work.plan(home,active).status : 'inactive';
  const executed = active ? work.run(home,active,{ rooms: 2,entries: 2,attempts: 1 }) : [];
  const record = createRemoteInfrastructureStore(state,home,remote).read();
  (memory.infrastructureRows ??= []).push({ tick: Game.time,active: !!active,generation: active?.generation ?? null,planned,stalePlan,
    staleAttempts: attempts(staleExecution),attempts: attempts(executed),draftRoutes: record.draft?.routes.length ?? 0,
    revision: record.revision,planGeneration: record.generation,stations: record.stations,plans: record.plans,
    ownedPlan: state.read('planning/W0N1'),ownedProgress: state.read('construction/W0N1'),
    sites: Object.values(Game.constructionSites).map(site => ({ id: site.id,room: site.pos.roomName,x: site.pos.x,y: site.pos.y,type: site.structureType })) });
}
function demand(): RemoteOutpostDemand | undefined {
  const lease = assignments.owner(remote,Game.time);
  return lease && remoteAssignmentDemands(lease,Game.time).find((item): item is RemoteOutpostDemand => item.kind === 'outpost');
}
function setAssignment(roads: boolean, lifetime: number): void {
  assignments.reconcile({ home,tick: Game.time,lifetime,expectedRevision: assignments.read().revision,
    plans: [{ room: remote,sources: Game.rooms[remote]!.find(FIND_SOURCES).map(source => source.id),reserve: null,infrastructure: { roads,containers: true } }] });
}
function attempts(results: ReturnType<typeof work.run>): number {
  return results.reduce((sum,result) => sum+('result' in result ? result.result.attempts : 0),0);
}
