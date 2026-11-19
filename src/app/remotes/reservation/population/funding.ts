import type { StatePort } from '../../../../persistence/versioned-state';
import type { RuntimeConfig } from '../../../../config/model';
import type { ReservationPlan } from '../../../../features/remotes/reservation/plan';
import { allocateReservationBirths } from '../../../../features/remotes/reservation/funding';
import { createSpawnQueue } from '../../../../features/population/spawn-queue';
import { observePopulation } from '../../../../adapters/screeps/population';
import { bodyCost } from '../../../../capabilities/spawning/body';
import { reservationIdentity } from '../../../../features/remotes/reservation/identity';
import { reservationNeedsBirth } from './model';
export function fundedReservations(state: StatePort, home: Room, config: Readonly<RuntimeConfig>, plans: readonly ReservationPlan[]): Set<string> {
  const pending = createSpawnQueue(state,home.name).list(), roster = observePopulation();
  const births = plans.map(plan => ({ owner: plan.owner,cost: plan.quote.body.cost,
    needed: reservationNeedsBirth(plan,roster,config.remoteSpawnRequestLifetime,Game.time) }));
  const others = pending.filter(request => !reservationIdentity(request.owner) && !Game.creeps[request.name] && request.expiresAt > Game.time);
  return allocateReservationBirths(births,home.storage?.store.energy ?? 0,config.remoteReservationEnergyReserve,others.reduce((sum,request) => sum+bodyCost(request.body),0));
}
