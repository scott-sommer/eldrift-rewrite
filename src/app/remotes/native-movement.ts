import type { Position } from '../../capabilities/movement/step';
import type { Outcome } from '../../core/execution/model';
import type { StatePort } from '../../persistence/versioned-state';
import type { IntelTraversalPolicy } from '../../features/intel/traversal-model';
import { movementPosition } from '../../adapters/screeps/movement-traffic';
import type { createNativeDispatch } from '../native-dispatch';
import { nativeRemoteRoute } from './native-route';
import { createRemoteObservationRefresh } from './native-observations';
export interface NativeRemoteOptions {
  policy(home: string, username: string): IntelTraversalPolicy;
  maximumRooms: number; guard(): boolean; refuge?(home: string): Position | undefined;
}
/** Shared remote approach/retirement; actual movement remains owned by application dispatch. */
export function createNativeRemoteMovement(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>, options: NativeRemoteOptions) {
  const refresh = createRemoteObservationRefresh(state);
  function route(creep: Creep, home: string, target: string, retreat = false) {
    if (!options.guard()) return undefined;
    refresh([home,creep.pos.roomName,target]);
    return nativeRemoteRoute(state,creep.pos.roomName,target,options.policy(home,creep.owner.username),options.maximumRooms,retreat,options.guard);
  }
  function move(creep: Creep, home: string, destination: Position, owner: string, retreat: boolean, range: number): Outcome {
    const policy = route(creep,home,destination.room,retreat);
    if (!policy) return { status: 'running' };
    dispatch.activate(); return dispatch.movement.move(creep,{ owner,destination,range,policy });
  }
  return { route,move,
    retire(creep: Creep, home: string, owner: string): Outcome {
      if (creep.spawning || !options.guard()) return { status: 'running' };
      const destination = refuge(home,options);
      return destination ? move(creep,home,destination,owner,true,3) : { status: 'running' };
    },
  };
}
function refuge(home: string, options: NativeRemoteOptions): Position | undefined {
  const room = Game.rooms[home];
  if (!room?.controller?.my) return undefined;
  const selected = options.refuge?.(home);
  if (selected) return selected.room === home ? selected : undefined;
  const anchor = room.storage ?? room.find(FIND_MY_SPAWNS).sort((a,b) => a.name.localeCompare(b.name))[0];
  return anchor ? movementPosition(anchor.pos) : undefined;
}
