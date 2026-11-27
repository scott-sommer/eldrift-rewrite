import { createTransitPlan } from '../../../../../capabilities/movement/transit/plan';
import { nativeCourierServiceTiming } from '../service-timing';
import type { PaidUnitContext } from '../../motion-observation/model';
import type { PaidCourierOpening } from '../../motion-observation/opening-model';
import type { StaticTravelLeg } from '../../../../../capabilities/movement/path-model';
import type { Position } from '../../../../../capabilities/movement/step';
import type { PaidCourierContinuation } from './continuation-model';
export function paidCourierContinuationInput(context: PaidUnitContext,basis: PaidCourierOpening,legs: readonly StaticTravelLeg[],origins: readonly Position[],minimumBatch: number) {
  const observed = basis.observed,epoch = observed.observedAt,retireTicks = context.paid.expiresAt-context.paid.retireAt;
  if (legs[2]!.ticks+nativeCourierServiceTiming.deliveryTicks > retireTicks) return undefined;
  const transit = (index: number) => createTransitPlan({ unit: observed.name,order: observed.name,owner: observed.owner,priority: 0,origin: origins[index]!,path: legs[index]!.path!,weight: 0,recovery: context.paid.body.filter(part => part === 'move').length*2 });
  const phase = basis.continuation.stage === 'deliver' ? 'deliver' : 'collect';
  const readyAt = basis.continuation.readyAt-epoch;
  if (readyAt >= observed.retireAt-epoch) return undefined;
  const initial: PaidCourierContinuation['initial'] = { id: observed.name,body: [...context.paid.body],availableAt: readyAt,expiresAt: observed.expiresAt-epoch,
    remainingSpawnTicks: Math.max(0,observed.activeAt-epoch),retireTicks,energy: observed.energy,phase,mode: 'courier',outboundTicks: legs[1]!.ticks,returnTicks: legs[2]!.ticks,minimumBatch,...nativeCourierServiceTiming };
  return { initial,route: { request: observed.name,approach: transit(0),empty: transit(1),loaded: transit(2) },
    opening: { request: observed.name,owner: observed.owner,plan: transit(3),readyAt,fatigue: observed.fatigue } };
}
