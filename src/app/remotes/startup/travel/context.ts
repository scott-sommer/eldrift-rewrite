import { createNativeStartupFacts } from '../facts';
import { createIntelStore } from '../../../../features/intel/store';
import { createRemoteObservationRefresh } from '../../native-observations';
import { nativeRemoteRoute } from '../../native-route';
import { startupTravelLegs } from '../../../../features/remotes/startup/travel-plan';
import { bodyCost } from '../../../../capabilities/spawning/body';
import type { StartupTravelPlan } from '../../../../features/remotes/startup/travel-model';
import type { StatePort } from '../../../../persistence/versioned-state';
import type { StartupStructures } from '../model';
import type { NativeStartupTravelRequest, StartupTravelOptions } from './model';
/** Refresh authority and safety before every use of persisted geometric progress. */
export function createStartupTravelContext(state: StatePort, structures: StartupStructures, options: StartupTravelOptions) {
  const observe = createNativeStartupFacts(state,structures), refresh = createRemoteObservationRefresh(state), intel = createIntelStore(state);
  return (request: NativeStartupTravelRequest, guard: () => boolean) => {
    const observed = observe(request.target,guard);
    if (observed.status !== 'observed') return observed;
    const facts = observed.facts, spawn = facts.spawns.find(item => item.id === request.spawn);
    if (!spawn) return { status: 'deferred' as const,reason: 'spawn' };
    const plan: StartupTravelPlan = { home: facts.home,room: facts.room,source: facts.source.id,
      spawn: { id: spawn.id,position: spawn.position,exit: request.exit },station: { room: facts.station.room,x: facts.station.x,y: facts.station.y },
      collection: request.collection,endpoint: { id: facts.endpoint.id,position: facts.endpoint.position,deposit: request.deposit },miner: request.miner,courier: request.courier };
    startupTravelLegs(plan);
    if (Math.max(bodyCost(plan.miner),bodyCost(plan.courier)) > facts.stock.spawnCapacity) return { status: 'deferred' as const,reason: 'body-budget' };
    if (!guard()) return { status: 'deferred' as const,reason: 'admission' };
    refresh([facts.home,facts.room]);
    const route = nativeRemoteRoute(state,facts.home,facts.room,request.traversal,options.maximumRooms,false,guard);
    if (!route?.allowedRooms || !guard()) return { status: 'deferred' as const,reason: 'route' };
    return { status: 'ready' as const,plan,facts,rooms: [...route.allowedRooms],route: route.version,intel: (room: string) => intel.peek(room,Game.time).record };
  };
}
