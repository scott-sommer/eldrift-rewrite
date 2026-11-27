import type { StatePort } from '../../persistence/versioned-state';
import type { IntelTraversalPolicy } from '../../features/intel/traversal-model';
import type { RoutePolicy } from '../../capabilities/movement/room-route';
import { createIntelTraversal } from '../../features/intel/traversal';
import { nativeScoutIntelPorts } from '../native-scout-policy';
/** A denied origin can be escaped, but an unsafe destination is never exempted. */
export function nativeRemoteRoute(state: StatePort, origin: string, target: string, policy: IntelTraversalPolicy,
  maximumRooms: number, retreat: boolean, guard: () => boolean): RoutePolicy | undefined {
  if (policy.mode !== 'known-safe' || !Number.isSafeInteger(maximumRooms) || maximumRooms < 1 || maximumRooms > 64) throw new Error('Invalid remote route policy');
  const traversal = createIntelTraversal(nativeScoutIntelPorts(state),policy,Game.time,guard);
  if (traversal.assess(target).status === 'blocked') return undefined;
  if (!retreat && traversal.assess(origin).status === 'blocked') return undefined;
  const route = Game.map.findRoute(origin,target,{ routeCallback: name => {
    if (retreat && name === origin) return 1;
    return traversal.cost(name);
  } });
  if (route === ERR_NO_PATH || traversal.diagnostics().incomplete) return undefined;
  const allowedRooms = [origin,...route.map(step => step.room)];
  if (allowedRooms.length > maximumRooms) return undefined;
  const permitted = allowedRooms.every(name => retreat && name === origin || traversal.allows(name));
  if (!permitted || traversal.diagnostics().incomplete) return undefined;
  return corridorPolicy(origin,allowedRooms,retreat,traversal,maximumRooms);
}

/** Bind the admitted corridor, not unrelated nodes explored by the route finder. */
function corridorPolicy(origin: string,allowedRooms: string[],retreat: boolean,traversal: ReturnType<typeof createIntelTraversal>,maximumRooms: number): RoutePolicy | undefined {
  const costs: Record<string,number> = {};
  for (const room of allowedRooms) {
    const cost = retreat && room === origin ? 1 : traversal.cost(room);
    if (!Number.isFinite(cost)) return undefined;
    costs[room] = cost;
  }
  if (traversal.diagnostics().incomplete) return undefined;
  return { version: JSON.stringify(['remote-corridor-v2',retreat,allowedRooms,costs]),blockedRooms: [],costs,maximumRooms,allowedRooms };
}
