import type { StatePort } from '../../../../persistence/versioned-state';
import type { RuntimeConfig } from '../../../../config/model';
import type { TaskDefinition } from '../../../../persistence/tasks/schema';
import type { EmpireFeature } from '../../../runtime-model';
import type { createNativeDispatch } from '../../../native-dispatch';
import { remoteConstructionIdentity } from '../../../../features/remotes/infrastructure/worker-identity';
import { createRemoteActorCursor } from '../../../../features/remotes/fleet/actor-cursor';
import { settleRemoteFleetTransfers } from '../../fleet/confirmations';
import { createNativeWorkerCollection } from '../../../native-worker-collection';
import { createNativeRemoteWorkCycle } from '../work-cycle';
import { nativeRemoteTraversalFor } from '../../management/policy';
import { createNativeConstructionPlans } from './plans';
import { constructionServiceDemand } from './model';
export function createNativeConstructionActors(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>, config: (home: string) => Readonly<RuntimeConfig>,
  definitions: Readonly<Record<string,TaskDefinition>>): EmpireFeature {
  const cursor = createRemoteActorCursor(state,'construction'), planHome = createNativeConstructionPlans(state), collect = createNativeWorkerCollection(state,dispatch);
  return { id: 'remote-construction-actors',scope: 'empire',urgency: 'urgent',interval: 1,run(context) {
    const actors = Object.values(Game.creeps).filter(creep => creep.my && !creep.spawning && remoteConstructionIdentity(creep.memory.population?.owner ?? ''));
    if (!actors.length) return;
    settleRemoteFleetTransfers(state,actors,definitions);
    const homes = [...new Set(actors.map(creep => remoteConstructionIdentity(creep.memory.population!.owner)!.home))];
    const budget = Math.max(context.config.values.remoteWorkerCpuBudget,...[...context.rooms.values()].map(room => room.values.remoteWorkerCpuBudget));
    const deadline = Math.min(Game.cpu.getUsed()+budget,Game.cpu.tickLimit*0.9), parentGuard = () => Game.cpu.getUsed() < deadline;
    for (const item of cursor.order(homes.map(name => ({ name })))) {
      if (!parentGuard()) break;
      runHome(item.name,actors.filter(creep => remoteConstructionIdentity(creep.memory.population!.owner)!.home === item.name)); cursor.save(item.name);
    }
    function runHome(home: string, creeps: Creep[]): void {
      const settings = context.rooms.get(home)?.values ?? config(home), end = Game.cpu.getUsed()+settings.remoteWorkerCpuBudget;
      const guard = () => parentGuard() && Game.cpu.getUsed() < end, result = planHome(home,settings,guard);
      if (!result.complete) return;
      const options = { maximumRooms: settings.remoteMaximumRouteRooms,guard,policy: (_home: string,username: string) => nativeRemoteTraversalFor(username,settings) };
      const supply = { collect: (creep: Creep,name: string,owner: string) => collect(creep,name,owner,{ ...settings,workerEnergyProfile: 'builder',workerEnergyStorageReserve: settings.remoteConstructionEnergyReserve }) };
      const units = createRemoteActorCursor(state,'construction:'+home);
      for (const creep of units.order(creeps)) {
        if (!guard()) break;
        const owner = creep.memory.population!.owner, plan = result.plans.find(plan => plan.owner === owner);
        const demand = constructionServiceDemand(creep,plan,result.selected);
        createNativeRemoteWorkCycle(state,dispatch,{ home,owner },options,supply,definitions).run(creep,demand); units.save(creep.name);
      }
    }
  } };
}
