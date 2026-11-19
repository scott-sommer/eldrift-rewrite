import { observePopulation } from '../../../../adapters/screeps/population';
import type { ReservationPlan } from '../../../../features/remotes/reservation/plan';
import { reservationNeedsBirth } from './model';
import type { StatePort } from '../../../../persistence/versioned-state';
import type { RuntimeConfig } from '../../../../config/model';
import type { SpawnRequest } from '../../../../capabilities/spawning/request';
import { reservationIdentity, reservationPrefix } from '../../../../features/remotes/reservation/identity';
import { createNativeReservationPlans } from './plans';
import { fundedReservations } from './funding';
import { reservationSpawningEnabled } from './policy';
/** Dispatch repeats current quote, generation, configuration and funding checks independently of recruitment. */
export function admitReservationSpawn(state: StatePort, request: SpawnRequest, config: (home: string) => Readonly<RuntimeConfig>): boolean {
  const identity = reservationIdentity(request.owner);
  if (!identity) return !request.owner.startsWith(reservationPrefix);
  if (request.room !== identity.home || (request.home ?? request.room) !== identity.home) return false;
  const settings = config(identity.home), home = Game.rooms[identity.home];
  if (!reservationSpawningEnabled(settings) || !home) return false;
  const end = Math.min(Game.cpu.getUsed()+settings.remoteWorkerCpuBudget,Game.cpu.tickLimit*0.9);
  const result = createNativeReservationPlans(state)(identity.home,settings,() => Game.cpu.getUsed() < end), plan = result.plans.find(plan => plan.owner === request.owner);
  if (!result.complete || !plan || request.body.join(',') !== plan.quote.body.parts.join(',')) return false;
  return readyBirth(state,home,settings,result.plans,plan);
}

function readyBirth(state: StatePort, home: Room, config: Readonly<RuntimeConfig>, plans: ReservationPlan[], plan: ReservationPlan): boolean {
  return home.energyAvailable >= plan.quote.body.cost && reservationNeedsBirth(plan,observePopulation(),config.remoteSpawnRequestLifetime,Game.time)
    && fundedReservations(state,home,config,plans).has(plan.owner);
}
