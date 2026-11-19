import type { StatePort } from '../../../../persistence/versioned-state';
import type { RuntimeConfig } from '../../../../config/model';
import type { TaskDefinition } from '../../../../persistence/tasks/schema';
import type { EmpireFeature } from '../../../runtime-model';
import type { createNativeDispatch } from '../../../native-dispatch';
import { reservationIdentity } from '../../../../features/remotes/reservation/identity';
import { createRemoteActorCursor } from '../../../../features/remotes/fleet/actor-cursor';
import { nativeRemoteTraversalFor } from '../../management/policy';
import { createNativeReservationCycle } from '../cycle';
import { createNativeReservationPlans } from './plans';
import { healthyReserver } from './model';
export function createNativeReservationActors(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>, config: (home: string) => Readonly<RuntimeConfig>, definitions: Readonly<Record<string,TaskDefinition>>): EmpireFeature {
  const planHome = createNativeReservationPlans(state), homesCursor = createRemoteActorCursor(state,'reservation');
  return { id: 'remote-reservation-actors',scope: 'empire',urgency: 'urgent',interval: 1,run(context) {
    const actors = Object.values(Game.creeps).filter(creep => creep.my && !creep.spawning && reservationIdentity(creep.memory.population?.owner ?? ''));
    if (!actors.length) return;
    const homes = [...new Set(actors.map(creep => reservationIdentity(creep.memory.population!.owner)!.home))];
    const budget = Math.max(context.config.values.remoteWorkerCpuBudget,...[...context.rooms.values()].map(room => room.values.remoteWorkerCpuBudget));
    const end = Math.min(Game.cpu.getUsed()+budget,Game.cpu.tickLimit*0.9), parentGuard = () => Game.cpu.getUsed() < end;
    for (const item of homesCursor.order(homes.map(name => ({ name })))) {
      if (!parentGuard()) break;
      const settings = context.rooms.get(item.name)?.values ?? config(item.name);
      runHome(item.name,settings); homesCursor.save(item.name);
    }
    function runHome(home: string, settings: Readonly<RuntimeConfig>): void {
      const deadline = Game.cpu.getUsed()+settings.remoteWorkerCpuBudget, guard = () => parentGuard() && Game.cpu.getUsed() < deadline;
      const result = planHome(home,settings,guard); if (!result.complete) return;
      const options = { maximumRooms: settings.remoteMaximumRouteRooms,guard,policy: (_home: string,username: string) => nativeRemoteTraversalFor(username,settings) };
      const cursor = createRemoteActorCursor(state,'reservation:'+home);
      for (const creep of cursor.order(actors.filter(creep => reservationIdentity(creep.memory.population!.owner)!.home === home))) {
        if (!guard()) break;
        const owner = creep.memory.population!.owner, plan = result.plans.find(plan => plan.owner === owner);
        const demand = plan && healthyReserver(creep,plan) && (creep.ticksToLive ?? 0) > plan.quote.economics.timing.retireTicks ? plan.demand : undefined;
        createNativeReservationCycle(state,dispatch,{ home,owner },options,definitions).run(creep,demand); cursor.save(creep.name);
      }
    }
  } };
}
