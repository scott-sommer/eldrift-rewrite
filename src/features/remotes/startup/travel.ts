import { copyPlain } from '../../../persistence/plain-data';
import { withinRange } from '../../../capabilities/movement/path-model';
import type { StaticTravelLeg } from '../../../capabilities/movement/path-model';
import type { StatePort } from '../../../persistence/versioned-state';
import { createStartupTravelProgress, validStartupTravelLeg } from './travel-progress';
import { startupTravelLegs } from './travel-plan';
import type { StartupTravelPlan, StartupTravelMeasure, StartupTravelResult } from './travel-model';
/** Durable geometric work only; the binding must be freshly admitted topology/policy, not cached authority. */
export function createStartupTravel(state: StatePort, home: string, measure: StartupTravelMeasure) {
  const store = createStartupTravelProgress(state,home);
  return (input: StartupTravelPlan, binding: string, tick: number, maximumLegs: number, guard: () => boolean): StartupTravelResult => {
    validateBudget(input,home,binding,tick,maximumLegs);
    const plan = copyPlain(input), requests = startupTravelLegs(plan), identity = JSON.stringify([plan,binding]);
    let record = store.read();
    if (tick < record.clock) return { status: 'deferred',reason: 'clock',completedLegs: 0 };
    const legs = retainedLegs(record,requests,identity);
    let measured = 0;
    while (legs.length < requests.length) {
      if (!guard()) return { status: 'deferred',reason: 'admission',completedLegs: legs.length };
      if (measured === maximumLegs) return { status: 'deferred',reason: 'leg-budget',completedLegs: legs.length };
      const request = requests[legs.length]!, result = measure(request,guard);
      if (result.status !== 'complete') return { ...result,completedLegs: legs.length };
      requireMeasurement(result,request.destination);
      legs.push({ ticks: result.ticks,operations: result.operations,arrival: { ...result.arrival } }); measured++;
      if (!store.save(record.revision,tick,identity,legs)) return { status: 'deferred',reason: 'progress-conflict',completedLegs: legs.length-1 };
      record = store.read();
    }
    if (!guard()) return { status: 'deferred',reason: 'admission',completedLegs: legs.length };
    return { status: 'complete',identity,plan,legs: legs.map((leg,index) => ({ ...leg,kind: requests[index]!.kind })),operations: legs.reduce((sum,leg) => sum+leg.operations,0) };
  };
}
function validateBudget(plan: StartupTravelPlan, home: string, binding: string, tick: number, maximumLegs: number): void {
  if (plan.home !== home || typeof binding !== 'string' || binding.length > 80000 || !Number.isSafeInteger(tick) || tick < 0) throw new Error('Invalid startup travel context');
  if (!Number.isSafeInteger(maximumLegs) || maximumLegs < 0 || maximumLegs > 5) throw new Error('Invalid startup travel leg budget');
}

function requireMeasurement(result: StaticTravelLeg, destination: StartupTravelPlan['station']): void {
  if (!validStartupTravelLeg(result) || !withinRange(result.arrival,destination,0)) throw new Error('Invalid startup travel measurement');
}
function retainedLegs(record: ReturnType<ReturnType<typeof createStartupTravelProgress>['read']>, requests: ReturnType<typeof startupTravelLegs>, identity: string) {
  if (record.identity !== identity) return [];
  record.legs.forEach((leg,index) => requireMeasurement(leg,requests[index]!.destination));
  return record.legs;
}
