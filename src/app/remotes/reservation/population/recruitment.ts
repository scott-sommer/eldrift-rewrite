import type { RuntimeConfig } from '../../../../config/model';
import type { RemoteBirthPermit } from '../../startup/model';
import { adoptReservationWorkers } from './adoption';
import type { TaskDefinition } from '../../../../persistence/tasks/schema';
import type { StatePort } from '../../../../persistence/versioned-state';
import type { RoomFeature } from '../../../runtime-model';
import type { createNativeDispatch } from '../../../native-dispatch';
import type { ReservationPlan } from '../../../../features/remotes/reservation/plan';
import { reservationIdentity } from '../../../../features/remotes/reservation/identity';
import { observePopulation } from '../../../../adapters/screeps/population';
import { applyPopulationDemand } from '../../../../features/population/apply-demand';
import { createSpawnQueue } from '../../../../features/population/spawn-queue';
import { reconcileDemand } from '../../../../capabilities/spawning/demand';
import { cancelRemotePopulation } from '../../cancel-population';
import { createNativeReservationPlans } from './plans';
import { fundedReservations } from './funding';
import { reservationPopulation, reservationRoster, reservationNeedsBirth } from './model';
import { reservationSpawningEnabled } from './policy';
export function createNativeReservationRecruitment(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>, definitions: Readonly<Record<string,TaskDefinition>>, permit: RemoteBirthPermit = () => true): RoomFeature {
  const planHome = createNativeReservationPlans(state);
  return { id: 'remote-reservation-recruitment',scope: 'owned',urgency: 'urgent',interval: 1,run(context) {
    const home = context.room.name, config = context.config.values;
    const deadline = Math.min(Game.cpu.getUsed()+config.remoteWorkerCpuBudget,Game.cpu.tickLimit*0.9), guard = () => Game.cpu.getUsed() < deadline;
    const result = planHome(home,config,guard);
    if (!result.complete || !adoptReservationWorkers(state,result.plans,definitions,guard)) return;
    const selected = reservationSpawningEnabled(config) && result.plans.length > 0 ? fundedReservations(state,Game.rooms[home]!,config,result.plans) : new Set<string>();
    applyStartupPolicy(selected,result.plans,config,permit);
    cancelRemotePopulation(state,dispatch,home,selected,reservationIdentity);
    for (const plan of result.plans.filter(plan => selected.has(plan.owner))) {
      if (!guard()) break;
      reconcileReservation(state,plan,config.remoteSpawnRequestLifetime); dispatch.activate();
    }
  } };
}
function reconcileReservation(state: StatePort, plan: ReservationPlan, lifetime: number): void {
  const queue = createSpawnQueue(state,plan.demand.home), demand = reservationPopulation(plan,lifetime);
  for (const request of queue.list().filter(request => request.owner === plan.owner && request.body.join(',') !== plan.quote.body.parts.join(','))) queue.cancel(request.id,plan.owner);
  const roster = reservationRoster(observePopulation(),plan), pending = queue.list(), decision = reconcileDemand(demand,roster,pending,Game.time);
  if (pending.length-decision.cancel.length+decision.missing <= 200) applyPopulationDemand(state,demand,roster,Game.time);
  else for (const id of decision.cancel) queue.cancel(id,plan.owner);
}

function applyStartupPolicy(selected: Set<string>, plans: readonly ReservationPlan[], config: Readonly<RuntimeConfig>, permit: RemoteBirthPermit): void {
  if (!selected.size) return;
  const roster = observePopulation();
  for (const plan of plans) {
    if (!selected.has(plan.owner)) continue;
    if (reservationNeedsBirth(plan,roster,config.remoteSpawnRequestLifetime,Game.time) && !permit(plan.owner,plan.quote.body.parts,config)) selected.delete(plan.owner);
  }
}
