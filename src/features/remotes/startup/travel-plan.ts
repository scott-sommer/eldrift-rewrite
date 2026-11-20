import { validWorldPosition } from '../../../core/geometry/world-position';
import type { BodyPart } from '../../../capabilities/spawning/body';
import type { StartupTravelPlan, StartupTravelLegRequest } from './travel-model';
/** Fixed service tiles keep successive trips comparable; current runtime movement must explicitly adopt this strategy. */
export function startupTravelLegs(plan: StartupTravelPlan): StartupTravelLegRequest[] {
  validatePlan(plan); const minerLoad = capacity(plan.miner), courierLoad = capacity(plan.courier);
  return [
    { kind: 'miner-approach',origin: plan.spawn.exit,destination: plan.station,range: 0,body: plan.miner,load: 0 },
    { kind: 'miner-return',origin: plan.station,destination: plan.endpoint.deposit,range: 0,body: plan.miner,load: minerLoad },
    { kind: 'courier-approach',origin: plan.spawn.exit,destination: plan.collection,range: 0,body: plan.courier,load: 0,blocked: [plan.station] },
    { kind: 'courier-empty',origin: plan.endpoint.deposit,destination: plan.collection,range: 0,body: plan.courier,load: 0,blocked: [plan.station] },
    { kind: 'courier-loaded',origin: plan.collection,destination: plan.endpoint.deposit,range: 0,body: plan.courier,load: courierLoad,blocked: [plan.station] },
  ];
}
function validatePlan(plan: StartupTravelPlan): void {
  if (plan.home === plan.room || ![plan.source,plan.spawn.id,plan.endpoint.id].every(id => typeof id === 'string' && id.length > 0 && id.length <= 240)) throw new Error('Invalid startup travel identity');
  for (const point of [plan.spawn.position,plan.spawn.exit,plan.station,plan.collection,plan.endpoint.position,plan.endpoint.deposit]) {
    if (!validWorldPosition(point)) throw new Error('Invalid startup travel position');
  }
  if (![plan.spawn.position,plan.spawn.exit,plan.endpoint.position,plan.endpoint.deposit].every(point => point.room === plan.home)) throw new Error('Invalid startup home geometry');
  if (![plan.station,plan.collection].every(point => point.room === plan.room)) throw new Error('Invalid startup source geometry');
  if (!adjacent(plan.spawn.position,plan.spawn.exit) || !adjacent(plan.station,plan.collection) || !adjacent(plan.endpoint.position,plan.endpoint.deposit)) throw new Error('Invalid startup service adjacency');
  validateBody(plan.miner,['work','carry','move']); validateBody(plan.courier,['carry','move']);
}
function validateBody(body: readonly BodyPart[], required: readonly BodyPart[]): void {
  if (!body.length || body.length > 50 || body.some(part => !required.includes(part)) || !required.every(part => body.includes(part))) throw new Error('Unsupported startup travel body');
}
function capacity(body: readonly BodyPart[]): number { return body.filter(part => part === 'carry').length*50; }
function adjacent(a: StartupTravelPlan['station'], b: StartupTravelPlan['station']): boolean { return a.room === b.room && Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y)) === 1; }
