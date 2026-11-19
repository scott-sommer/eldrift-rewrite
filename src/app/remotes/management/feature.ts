import { createNativeReservationCandidates } from '../reservation/candidates';
import type { RemoteManagementRequest } from '../../../features/remotes/management/model';
import type { RemoteAssignment } from '../../../features/remotes/assignment-model';
import type { RemotePortfolio } from '../../../features/remotes/portfolio-model';
import type { StatePort } from '../../../persistence/versioned-state';
import type { RoomFeature, FeatureContext } from '../../runtime-model';
import { advanceNativeRemoteDiscovery } from '../discovery/native';
import { nativeRemoteManagementPolicy, nativeRemoteTraversal } from './policy';
import { createNativeRemoteManagement } from './native';
/** Default-off registration performs no native/state reads; discovery and lease management share one caller CPU deadline. */
export function createNativeRemoteManagementFeature(state: StatePort, committed: (request: RemoteManagementRequest, result: { assignments: RemoteAssignment[]; portfolio: RemotePortfolio }) => void = () => {}): RoomFeature {
  const reservationCandidates = createNativeReservationCandidates(state);
  return { id: 'remote-management',scope: 'owned',urgency: 'background',interval: 1,run(context) {
    const config = context.config.values;
    if (!enabled(context)) return;
    const home = Game.rooms[context.room.name];
    if (!home?.controller?.my || home.controller.level < config.remoteMinimumRcl) return;
    const deadline = Math.min(Game.cpu.getUsed()+config.remoteCpuBudget,Game.cpu.tickLimit*config.backgroundCpuFraction);
    const guard = () => Game.cpu.getUsed() < deadline;
    if (!guard()) return;
    const discovered = advanceNativeRemoteDiscovery(state,home.name,nativeRemoteTraversal(home,config),
      { depth: config.remoteDepth,maximumRooms: config.remoteDiscoveryRooms,refreshInterval: config.remoteDiscoveryRefresh },config.remoteDiscoveryReads,guard);
    const policy = nativeRemoteManagementPolicy(home,discovered.rooms,config);
    if (!policy || !guard()) return;
    if (discovered.status !== 'complete' && !discovered.rooms.length) return;
    const request = { home: home.name,tick: Game.time,policy: reservationCandidates(home,policy,config,guard) };
    const result = createNativeRemoteManagement(state,{ maximumRooms: config.remoteMaximumRouteRooms,maximumOps: config.remoteMaximumPathOps })
      .advance(request,{ rooms: config.remoteScanRooms,sources: config.remoteScanSources },guard);
    if (result.status === 'applied') committed(request,result);
  } };
}

function enabled(context: FeatureContext): boolean { return context.config.values.remoteManagementEnabled && context.room.owned; }
