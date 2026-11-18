import type { RuntimeConfig } from '../config/model';
import type { StatePort } from '../persistence/versioned-state';
import type { Outcome } from '../core/execution/model';
import type { RoutePolicy } from '../capabilities/movement/room-route';
import { createIntelTraversal } from '../features/intel/traversal';
import { nativeScoutIntelPorts, nativeScoutPolicy } from './native-scout-policy';
export function nativeScoutRoute(state: StatePort, creep: Creep, home: string, target: string,
  config: Readonly<RuntimeConfig>, avoid: Readonly<Record<string,number>>): RoutePolicy | Outcome {
  const origin = creep.pos.roomName;
  const traversal = createIntelTraversal(nativeScoutIntelPorts(state),{ ...nativeScoutPolicy(state,home,creep.owner.username,config,avoid),
    maximumRooms: config.scoutMaximumRouteRooms*64 },
    Game.time, () => Game.cpu.getUsed() < Game.cpu.tickLimit);
  const destination = traversal.assess(target);
  if (destination.status === 'blocked') return excluded(destination.reason);
  const costs: Record<string,number> = {};
  const route = Game.map.findRoute(origin,target,{ routeCallback: room => {
    if (room === origin) return 1;
    const cost = traversal.cost(room);
    if (Number.isFinite(cost)) costs[room] = cost;
    return cost;
  } });
  if (route === ERR_NO_PATH) return noRoute(traversal.diagnostics().incomplete);
  const allowedRooms = [origin,...route.map(step => step.room)];
  if (allowedRooms.length > config.scoutMaximumRouteRooms) return { status: 'failed', reason: 'scout-room-limit' };
  return { version: JSON.stringify(['scout',allowedRooms,costs]), blockedRooms: [], costs,
    maximumRooms: config.scoutMaximumRouteRooms, allowedRooms };
}
function noRoute(incomplete: string | undefined): Outcome {
  return incomplete ? { status: 'blocked', reason: 'scout-route-admission', retryAt: Game.time+1 }
    : { status: 'failed', reason: 'no-scout-room-route' };
}

function excluded(reason: string): Outcome {
  if (reason === 'admission' || reason === 'room-budget') return noRoute(reason);
  return { status: 'failed', reason: `scout-destination-${reason}` };
}
