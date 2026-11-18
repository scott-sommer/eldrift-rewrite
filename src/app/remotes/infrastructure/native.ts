import type { StatePort } from '../../../persistence/versioned-state';
import { createRemoteAssignmentStore } from '../../../features/remotes/assignment-store';
import type { RemoteOutpostDemand } from '../../../features/remotes/infrastructure/model';
import { createRemoteInfrastructureExecution } from '../../../features/remotes/infrastructure/execution';
import { reservedConstructionPorts } from '../../../features/construction/reservation-ledger';
import type { createConstructionReservationLedger } from '../../../features/construction/reservation-ledger';
import { nativeConstructionPorts, nativeConstructionSiteKeys } from '../../native-construction-ports';
import { createNativeRemoteInfrastructurePlanning } from './planning';
import type { NativeRemoteInfrastructurePlanningOptions } from './planning';
import { createRemoteObservationRefresh } from '../native-observations';
import { nativeRemoteRoute } from '../native-route';
export interface NativeRemoteInfrastructureOptions extends NativeRemoteInfrastructurePlanningOptions { roomSites: number }
/** Caller shares the tick construction ledger with every owned/remote executor. */
export function createNativeRemoteInfrastructure(state: StatePort, ledger: ReturnType<typeof createConstructionReservationLedger>, options: NativeRemoteInfrastructureOptions) {
  if (!Number.isSafeInteger(options.roomSites) || options.roomSites < 1 || options.roomSites > 100) throw new Error('Invalid remote room site budget');
  const planning = createNativeRemoteInfrastructurePlanning(state,options), assignments = createRemoteAssignmentStore(state), refresh = createRemoteObservationRefresh(state);
  function authority(home: string, input: RemoteOutpostDemand, name: string): string | undefined {
    if (!options.guard()) return undefined;
    const demand = assignments.resolve(input,Game.time), room = Game.rooms[home];
    if (demand?.kind !== 'outpost' || demand.home !== home || !room?.controller?.my) return undefined;
    const username = room.controller.owner!.username;
    refresh([home,demand.room,name]);
    if (!neutral(demand.room,username) || !constructible(name,home,username)) return undefined;
    const route = nativeRemoteRoute(state,home,demand.room,options.policy(home,username),options.maximumRooms,false,options.guard);
    return route?.allowedRooms?.includes(name) ? username : undefined;
  }
  return { plan: planning.advance,
    run(home: string, demand: RemoteOutpostDemand, budget: { rooms: number; entries: number; attempts: number }) {
      const execution = createRemoteInfrastructureExecution(state,home,{ clock: () => Game.time,guard: options.guard,
        admit: name => !!authority(home,demand,name),construction: name => {
          const username = authority(home,demand,name);
          if (!username) throw new Error('Remote construction authority unavailable');
          return reservedConstructionPorts(name,nativeConstructionPorts(name,options.roomSites,false,{ rooms: [name],username }),
            ledger,() => Game.time,nativeConstructionSiteKeys);
        } });
      return execution.run(demand,budget);
    } };
}
function neutral(name: string, username: string): boolean {
  const controller = Game.rooms[name]?.controller;
  return !!Game.rooms[name] && !controller?.owner && (!controller?.reservation || controller.reservation.username === username);
}
function constructible(name: string, home: string, username: string): boolean {
  return name === home ? !!Game.rooms[home]?.controller?.my : neutral(name,username);
}
