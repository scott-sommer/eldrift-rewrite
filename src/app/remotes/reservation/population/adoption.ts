import type { StatePort } from '../../../../persistence/versioned-state';
import { peekState } from '../../../../persistence/versioned-state';
import { stateKey } from '../../../../persistence/state-key';
import { taskSchema } from '../../../../persistence/tasks/schema';
import type { TaskDefinition } from '../../../../persistence/tasks/schema';
import type { ReservationPlan } from '../../../../features/remotes/reservation/plan';
import { reservationIdentity } from '../../../../features/remotes/reservation/identity';
import { replacementDue } from '../../../../capabilities/spawning/request';
import { healthyReserver } from './model';
/** Only safely returned idle workers can accept a fresh generation after revoked authority. */
export function adoptReservationWorkers(state: StatePort, plans: readonly ReservationPlan[], definitions: Readonly<Record<string,TaskDefinition>>, guard: () => boolean): boolean {
  const actors = Object.values(Game.creeps).filter(creep => creep.my && reservationIdentity(creep.memory.population?.owner ?? ''));
  for (const plan of plans) {
    if (!guard()) return false;
    if (actors.some(creep => creep.memory.population!.owner === plan.owner && (creep.spawning || ready(creep,plan)))) continue;
    const candidate = actors.find(creep => reusable(creep,plan) && !peekState(state,stateKey('tasks',creep.name),taskSchema(creep.name,definitions))?.queue.length);
    if (candidate) candidate.memory.population = { home: plan.demand.home,owner: plan.owner };
  }
  return guard();
}
function reusable(creep: Creep, plan: ReservationPlan): boolean {
  const identity = reservationIdentity(creep.memory.population!.owner)!;
  return identity.home === plan.demand.home && identity.room === plan.demand.room && identity.generation < plan.demand.generation
    && creep.memory.population!.home === plan.demand.home && creep.pos.roomName === plan.demand.home && ready(creep,plan);
}
function ready(creep: Creep, plan: ReservationPlan): boolean {
  if (creep.spawning || !healthyReserver(creep,plan)) return false;
  const timing = plan.quote.economics.timing;
  return !replacementDue(creep.ticksToLive ?? 0,plan.quote.body.parts.length,timing.travelTicks,timing.retireTicks+timing.marginTicks);
}
