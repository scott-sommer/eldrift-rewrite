import { validCompleteStartupTravel } from '../../../../../features/remotes/startup/selection-validation';
import { startupTravelLegs } from '../../../../../features/remotes/startup/travel-plan';
import { validStaticPath } from '../../../../../capabilities/movement/static-path';
import { createTransitPlan } from '../../../../../capabilities/movement/transit/plan';
import { plannedMobility } from '../../../../../capabilities/movement/planned-mobility';
import { pathTravelClock } from '../../../../../adapters/screeps/path-travel-clock';
import { createMotionTerrain } from './terrain';
import type { StartupBirthProposal } from '../model';
import type { NativeMotionQuote,NativeMotionGeometry,MotionGeometryEnvironment } from './model';
/** Compile physical geometry only; home obligations and financial authority remain separate. */
export function compileStartupMotionGeometry(quote: NativeMotionQuote,births: readonly StartupBirthProposal[],environment: MotionGeometryEnvironment,guard: () => boolean): NativeMotionGeometry {
  if (!validCompleteStartupTravel(quote,quote.plan.home) || !matchingTopology(quote,environment.topology)) return { status: 'deferred',reason: 'motion-topology' };
  const requests = startupTravelLegs(quote.plan),terrain = createMotionTerrain(environment);
  const refusal = collectGeometry(quote,requests,terrain,guard);
  if (refusal) return { status: 'deferred',reason: refusal };
  const couriers = births.filter(birth => birth.kind === 'courier');
  if (couriers.length > 16 || new Set(couriers.map(birth => birth.request.id)).size !== couriers.length) return { status: 'deferred',reason: 'motion-roster' };
  if (couriers.some(birth => JSON.stringify(birth.request.body) !== JSON.stringify(quote.plan.courier))) return { status: 'deferred',reason: 'motion-body' };
  const routes = couriers.map(birth => {
    const route = (index: number) => createTransitPlan({ unit: birth.request.id,order: birth.request.name,owner: birth.request.owner,priority: 0,
      origin: requests[index]!.origin,path: quote.legs[index]!.path!,weight: 0,recovery: birth.request.body.filter(part => part === 'move').length*2 });
    return { request: birth.request.id,approach: route(2),empty: route(3),loaded: route(4) };
  });
  if (!guard()) return { status: 'deferred',reason: 'budget' };
  return { status: 'ready',observedAt: quote.observedAt,quoteIdentity: quote.identity,geometry: { routes,terrain: terrain.result() } };
}
function matchingTopology(quote: NativeMotionQuote,topology: string): boolean {
  try {
    const identity: unknown = JSON.parse(quote.identity);
    if (!Array.isArray(identity) || typeof identity[1] !== 'string') return false;
    const binding: unknown = JSON.parse(identity[1]);
    return Array.isArray(binding) && binding[0] === 'startup-fixed-service-v3' && binding[1] === topology;
  } catch { return false; }
}

function collectGeometry(quote: NativeMotionQuote,requests: ReturnType<typeof startupTravelLegs>,terrain: ReturnType<typeof createMotionTerrain>,guard: () => boolean): string | undefined {
  for (const [index,leg] of quote.legs.entries()) {
    if (!guard()) return 'budget';
    const request = requests[index]!;
    if (!leg.path || !validStaticPath(request.origin,leg.path,leg.arrival)) return 'motion-path';
    const refusal = terrain.path(request.origin,leg.path,guard); if (refusal) return refusal;
    const ticks = pathTravelClock(request.origin,leg.path,plannedMobility(request.body,request.load),terrain.rate);
    if (ticks !== leg.ticks) return 'motion-clock';
  }
  return undefined;
}
