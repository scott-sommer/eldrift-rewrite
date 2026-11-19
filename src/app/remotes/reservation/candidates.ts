import type { StatePort } from '../../../persistence/versioned-state';
import type { RuntimeConfig } from '../../../config/model';
import type { RemoteManagementPolicy } from '../../../features/remotes/management/model';
import { createReservationSelection } from '../../../features/remotes/reservation/selection/cycle';
import { createNativeReservationQuote } from './native-quote';
/** Explicit quote decisions decorate room policy; source observations and portfolio selection keep their own owners. */
export function createNativeReservationCandidates(state: StatePort) {
  return (home: Room, policy: RemoteManagementPolicy, config: Readonly<RuntimeConfig>, guard: () => boolean): RemoteManagementPolicy => {
    if (!config.remoteReservationEnabled) return policy;
    const options = { maximumRooms: config.remoteMaximumRouteRooms,maximumOps: config.remoteMaximumPathOps };
    const bodyBudget = Math.min(home.energyCapacityAvailable,config.remoteReservationBodyBudget);
    const pricing = { bodyBudget,minimumBufferTicks: config.remoteReservationMinimumBuffer,replacementMargin: config.remoteReservationMargin };
    const rooms = policy.candidates.map(candidate => candidate.room), quote = createNativeReservationQuote(state,options);
    const select = createReservationSelection(state,home.name,(room,admitted) => quote({ home: home.name,room,tick: Game.time,traversal: policy.traversal,...pricing },admitted));
    const entries = select({ tick: Game.time,identity: JSON.stringify([rooms,pricing,policy.traversal,options]),rooms,
      reads: config.remoteReservationQuoteRooms,refreshInterval: config.remoteReassessInterval,maximumAge: config.intelMaximumAge },guard);
    const quotes = new Map(entries.map(entry => [entry.room,entry.quote]));
    return { ...policy,candidates: policy.candidates.map(candidate => ({ ...candidate,reservation: quotes.get(candidate.room) ?? null })) };
  };
}
