import type { StatePort } from '../../../../persistence/versioned-state';
import type { RoomFeature } from '../../../runtime-model';
import type { createNativeDispatch } from '../../../native-dispatch';
import { observePopulation } from '../../../../adapters/screeps/population';
import { createSpawnQueue } from '../../../../features/population/spawn-queue';
import { applyPopulationDemand } from '../../../../features/population/apply-demand';
import { reconcileDemand } from '../../../../capabilities/spawning/demand';
import { cancelUnselected } from './cancellation';
import { createNativeConstructionPlans } from './plans';
import { constructionPopulation, healthyConstructionWorker } from './model';
import type { NativeConstructionPlan } from './model';
import { constructionSpawningEnabled } from './policy';
export function createNativeConstructionRecruitment(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>): RoomFeature {
  const planHome = createNativeConstructionPlans(state);
  return { id: 'remote-construction-recruitment',scope: 'owned',urgency: 'urgent',interval: 1,run(context) {
    const home = context.room.name, config = context.config.values;
    const deadline = Math.min(Game.cpu.getUsed()+config.remoteWorkerCpuBudget,Game.cpu.tickLimit*0.9), guard = () => Game.cpu.getUsed() < deadline;
    const result = planHome(home,config,guard);
    if (!result.complete) return;
    const selected = constructionSpawningEnabled(config) ? result.selected : new Set<string>();
    cancelUnselected(state,dispatch,home,selected);
    for (const plan of result.plans.filter(plan => selected.has(plan.owner))) {
      if (!guard()) break;
      reconcileConstruction(state,plan,config.remoteSpawnRequestLifetime); dispatch.activate();
    }
  } };
}
function reconcileConstruction(state: StatePort, plan: NativeConstructionPlan, lifetime: number): void {
  const queue = createSpawnQueue(state,plan.demand.home), demand = constructionPopulation(plan,1,lifetime);
  for (const request of queue.list().filter(request => request.owner === plan.owner && JSON.stringify(request.body) !== JSON.stringify(plan.body.parts))) queue.cancel(request.id,plan.owner);
  const roster = observePopulation().filter(unit => unit.owner !== plan.owner || healthyConstructionWorker(Game.creeps[unit.name]!,plan.body.parts));
  const pending = queue.list(), decision = reconcileDemand(demand,roster,pending,Game.time);
  if (pending.length-decision.cancel.length+decision.missing <= 200) applyPopulationDemand(state,demand,roster,Game.time);
  else for (const id of decision.cancel) queue.cancel(id,plan.owner);
}
