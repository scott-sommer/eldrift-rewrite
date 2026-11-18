import { insideRoom } from '../../../core/geometry/local-grid';
import type { StatePort } from '../../../persistence/versioned-state';
import type { Position } from '../../../capabilities/movement/step';
import { createIntelStore } from '../../../features/intel/store';
import { createRemoteAssignmentStore } from '../../../features/remotes/assignment-store';
import { createRemoteInfrastructureStore } from '../../../features/remotes/infrastructure/store';
import type { RemoteInfrastructureDraft, RemoteOutpostDemand } from '../../../features/remotes/infrastructure/model';
import { observeMiningStations } from '../../../adapters/screeps/mining-stations';
import { createMatrixSnapshots } from '../../../adapters/screeps/matrix-snapshots';
import { createNativePathSearch } from '../../../adapters/screeps/path-search';
import { prepareRemoteMatrices } from '../assessment/matrices';
import { createRemoteObservationRefresh } from '../native-observations';
import { nativeRemoteRoute } from '../native-route';
import type { NativeRemoteOptions } from '../native-movement';
export interface NativeRemoteInfrastructurePlanningOptions extends NativeRemoteOptions { maximumOps: number; sourceSearches: number }
/** Bounded path searches accumulate in a generation/topology-fenced draft, surviving global resets. */
export function createNativeRemoteInfrastructurePlanning(state: StatePort, options: NativeRemoteInfrastructurePlanningOptions) {
  if (!Number.isSafeInteger(options.maximumOps) || options.maximumOps < 1 || options.maximumOps > 100000) throw new Error('Invalid remote infrastructure path budget');
  if (!Number.isSafeInteger(options.sourceSearches) || options.sourceSearches < 1 || options.sourceSearches > 16) throw new Error('Invalid infrastructure source budget');
  const assignments = createRemoteAssignmentStore(state), intel = createIntelStore(state), refresh = createRemoteObservationRefresh(state), snapshots = createMatrixSnapshots();
  function context(home: string, input: RemoteOutpostDemand) {
    if (!options.guard()) return undefined;
    const demand = assignments.resolve(input,Game.time), anchor = homeAnchor(home);
    if (demand?.kind !== 'outpost' || demand.home !== home || !anchor || !Game.rooms[demand.room]) return undefined;
    if (!neutralTarget(demand.room,anchor.owner.username)) return undefined;
    refresh([home,demand.room]);
    const route = nativeRemoteRoute(state,home,demand.room,options.policy(home,anchor.owner.username),options.maximumRooms,false,options.guard);
    if (!route?.allowedRooms) return undefined;
    const assignment = assignments.owner(demand.room,Game.time)!, stations = observeMiningStations(demand.room,'safe')!;
    const targets = assignment.plan.sources.map(id => stations.find(station => station.id === id && station.kind === 'energy'))
      .map(station => station && ({ ...station,access: station.access.filter(tile => insideRoom(tile,1)) }));
    if (targets.some(station => !station?.access.length)) return undefined;
    const matrices = prepareRemoteMatrices({ intel: name => intel.peek(name,Game.time).record },route.allowedRooms,1,snapshots);
    return { demand,route,matrices,targets: targets.map(station => station!),origin: { room: home,x: anchor.pos.x,y: anchor.pos.y } };
  }
  return { advance(home: string, input: RemoteOutpostDemand) {
    const view = context(home,input);
    if (!view) return { status: 'deferred' as const };
    const store = createRemoteInfrastructureStore(state,home,input.room), record = store.read();
    const identity = JSON.stringify([view.demand.generation,view.route.version,view.matrices.version,view.targets.map(station => [station.id,station.position,station.access[0]])]);
    const draft = matchingDraft(record,view.demand,identity,view.targets.map(station => station.id));
    if (draft.routes.length === draft.sources.length && record.draft?.identity === identity) return { status: 'unchanged' as const };
    let searched = 0;
    for (const station of view.targets.filter(station => !draft.routes.some(route => route.source === station.id))) {
      if (searched >= options.sourceSearches || !options.guard()) break;
      searched++;
      const destination = station.access[0]!, path = search(view.origin,destination,view.route.allowedRooms!,view.matrices,options.maximumOps);
      if (path.status !== 'complete') break;
      draft.routes.push({ source: station.id,target: station.position,station: destination,path: path.path });
    }
    if (!searched) return { status: 'deferred' as const };
    return store.save(record.revision,view.demand,draft,Game.time);
  } };
}
function search(origin: Position, destination: Position, rooms: readonly string[], matrices: ReturnType<typeof prepareRemoteMatrices>, maximumOps: number) {
  return createNativePathSearch(matrices.matrix)({ origin,destination,range: 0,allowedRooms: rooms,
    profile: { id: 'remote-infrastructure',plainCost: 2,swampCost: 10,maxOps: maximumOps,maxRooms: rooms.length },
    topologyVersion: matrices.version,policyVersion: 'remote-infrastructure-v1' });
}

function homeAnchor(home: string) {
  const room = Game.rooms[home];
  if (!room?.controller?.my) return undefined;
  return room.storage ?? room.find(FIND_MY_SPAWNS)[0];
}
function matchingDraft(record: ReturnType<ReturnType<typeof createRemoteInfrastructureStore>['read']>, demand: RemoteOutpostDemand,
  identity: string, sources: string[]): RemoteInfrastructureDraft {
  return record.generation === demand.generation && record.draft?.identity === identity ? record.draft : { identity,sources,routes: [] };
}

function neutralTarget(name: string, username: string): boolean {
  const controller = Game.rooms[name]?.controller;
  return !controller?.owner && (!controller?.reservation || controller.reservation.username === username);
}
