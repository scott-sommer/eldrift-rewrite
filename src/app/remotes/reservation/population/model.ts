import { reconcileDemand } from '../../../../capabilities/spawning/demand';
import type { ReservationPlan } from '../../../../features/remotes/reservation/plan';
import type { DemandPlan } from '../../../../features/population/apply-demand';
import type { PopulationUnit } from '../../../../capabilities/spawning/demand';
export function reservationPopulation(plan: ReservationPlan, requestLifetime: number): DemandPlan {
  const timing = plan.quote.economics.timing;
  return { owner: plan.owner,room: plan.demand.home,desired: 1,body: plan.quote.body.parts,replacementParts: plan.quote.body.parts.length,
    travelTicks: timing.travelTicks,marginTicks: timing.retireTicks+timing.marginTicks,priority: 50,requestLifetime };
}
export function healthyReserver(creep: Creep, plan: ReservationPlan): boolean {
  return creep.body.map(part => part.type).join(',') === plan.quote.body.parts.join(',') && creep.body.every(part => part.hits > 0);
}
export function reservationRoster(roster: readonly PopulationUnit[], plan: ReservationPlan): PopulationUnit[] {
  return roster.filter(unit => unit.owner !== plan.owner || healthyReserver(Game.creeps[unit.name]!,plan));
}

export function reservationNeedsBirth(plan: ReservationPlan, roster: readonly PopulationUnit[], lifetime: number, tick: number): boolean {
  return reconcileDemand(reservationPopulation(plan,lifetime),reservationRoster(roster,plan),[],tick).effective < 1;
}
