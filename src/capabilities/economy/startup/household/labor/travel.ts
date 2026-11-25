import { copyPlain } from '../../../../../core/plain-data';
import { plannedMobility } from '../../../../movement/planned-mobility';
import { quoteActionTravel } from '../../../../movement/action-travel';
import { validateLaborTravel, validateLaborRoute } from './travel-validation';
import type { LaborTravelPlan, LaborTravelLeg, LaborRoute, LaborTravelMeasure } from './travel-model';
export function quoteLaborTravel(plan: LaborTravelPlan, binding: string, measure: LaborTravelMeasure, guard: () => boolean = () => true) {
  validateLaborTravel(plan);
  if (typeof binding !== 'string' || !binding.length || binding.length > 8192) throw new Error('Invalid labor travel binding');
  plan = copyPlain(plan);
  const legs: (LaborTravelLeg & LaborRoute & { ticks: number; arrivalFatigue: number })[] = []; let fatigue = 0;
  for (const leg of requests(plan)) {
    if (!guard()) return deferred('admission',legs.length);
    const measured = measure(copyPlain(leg),guard); if (measured.status !== 'complete') return deferred(measured.reason,legs.length);
    validateLaborRoute(measured,leg);
    const mobility = plannedMobility(plan.body,leg.load), quote = quoteActionTravel(mobility,measured.terrain,fatigue);
    if (quote.status !== 'complete') return deferred(quote.reason,legs.length);
    legs.push({ ...leg,...copyPlain(measured),ticks: quote.ticks,arrivalFatigue: quote.arrivalFatigue });
    const resting = leg.kind === 'approach' ? 1 : plan.workTicks;
    fatigue = Math.max(0,quote.arrivalFatigue-resting*(mobility.mobile ? mobility.recovery : 0));
  }
  return { status: 'complete' as const,identity: JSON.stringify([plan,binding]),plan,legs,operations: legs.reduce((sum,leg) => sum+leg.operations,0) };
}
function requests(plan: LaborTravelPlan): LaborTravelLeg[] {
  return [
    { kind: 'approach',origin: plan.spawn.exit,destination: plan.source.pickup,body: plan.body,load: 0 },
    { kind: 'loaded',origin: plan.source.pickup,destination: plan.target.service,body: plan.body,load: plan.load },
    { kind: 'return',origin: plan.target.service,destination: plan.source.pickup,body: plan.body,load: plan.remainingLoad },
  ];
}
function deferred(reason: string, completedLegs: number) { return { status: 'deferred' as const,reason,completedLegs }; }
export type LaborTravelQuote = Extract<ReturnType<typeof quoteLaborTravel>,{ status: 'complete' }>;
