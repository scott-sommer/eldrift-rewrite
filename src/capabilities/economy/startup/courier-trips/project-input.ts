import { prepareCourierOpenings,physicalCourierIdentity } from './project-openings';
import { validateCourierRoute } from './validation';
import { createTransitPlan } from '../../../movement/transit/plan';
import { validWorldPosition } from '../../../../core/geometry/world-position';
import { tileKey } from '../../../movement/traffic/model';
import type { StartupDeliveryInput } from '../delivery-model';
import type { StartupProjectMotionInput } from './project-model';
/** Geometry is input-bound; this validates the strategy, never grants financial authority. */
export function prepareStartupProjectMotion(input: StartupDeliveryInput): StartupProjectMotionInput {
  const motion = input.motion!;
  const openings = prepareCourierOpenings(input);
  if (motion.routes.length !== input.couriers.length+(input.initial?.couriers.length ?? 0) || motion.routes.length > 16) throw new Error('Physical courier route count');
  if (new Set(motion.routes.map(route => route.request)).size !== motion.routes.length) throw new Error('Duplicate physical courier route');
  validateTerrain(motion); validateBlockers(motion);
  const routes = motion.routes.map(route => {
    const request = physicalCourierIdentity(input,route.request);
    const recovery = request.body.filter(part => part === 'move').length*2;
    const plans = [route.approach,route.empty,route.loaded];
    if (plans.some(plan => (plan.order ?? plan.unit) !== request.name)) throw new Error('Physical courier order/name mismatch');
    if (plans.some(plan => plan.unit !== route.request || plan.owner !== request.owner || plan.recovery !== recovery)) throw new Error('Physical courier body/owner mismatch');
    const prepared = { request: route.request,approach: createTransitPlan(route.approach),empty: createTransitPlan(route.empty),loaded: createTransitPlan(route.loaded) };
    validateCourierRoute({ ...prepared,activeAt: 0 });
    return prepared;
  });
  return { ...motion,routes,...(openings ? { openings } : {}) };
}
function validateTerrain(motion: StartupProjectMotionInput): void {
  if (motion.terrain.length > 10000) throw new Error('Physical courier terrain bound');
  const seen = new Set<string>();
  for (const fact of motion.terrain) {
    if (!validWorldPosition(fact.position) || ![1,2,10].includes(fact.rate)) throw new Error('Invalid physical courier terrain');
    const key = tileKey(fact.position);
    if (seen.has(key)) throw new Error('Duplicate physical courier terrain');
    seen.add(key);
  }
}
function validateBlockers(motion: StartupProjectMotionInput): void {
  if (motion.blockers.length > 256) throw new Error('Physical courier blocker bound');
  for (const blocker of motion.blockers) {
    if (!blocker.unit || !validWorldPosition(blocker.position)) throw new Error('Invalid physical courier blocker');
    if (![blocker.startAt,blocker.endAt].every(value => Number.isSafeInteger(value) && value >= 0) || blocker.endAt <= blocker.startAt) throw new Error('Invalid physical courier blocker clock');
  }
}
