import { tileKey } from '../../../../../capabilities/movement/traffic/model';
import { validWorldPosition } from '../../../../../core/geometry/world-position';
import { withinRange } from '../../../../../capabilities/movement/path-model';
import type { PaidUnitContext } from '../../motion-observation/model';
import type { PaidCourierOpening } from '../../motion-observation/opening-model';
import type { PaidCourierContinuationOptions } from './continuation-model';
import type { StartupTravelLegRequest } from '../../../../../features/remotes/startup/travel-model';
export function continuationRequests(context: PaidUnitContext,basis: PaidCourierOpening,options: PaidCourierContinuationOptions): StartupTravelLegRequest[] | undefined {
  const plan = context.plan,body = context.paid.body,points = [plan.station,...options.blocked];
  if (!points.every(validWorldPosition)) return undefined;
  const blocked = [...new Map(points.map(point => [tileKey(point),point])).values()];
  if (blocked.length > 64) return undefined;
  const request = (origin: typeof plan.station,destination: typeof plan.station,load: number): StartupTravelLegRequest => ({ kind: 'courier-approach',origin,destination,range: 0,body,load,blocked });
  const origin = basis.continuation.stage === 'spawning' ? plan.spawn.exit : basis.observed.position;
  const destination = basis.continuation.stage === 'deliver' ? plan.endpoint.deposit : plan.collection;
  return [request(plan.spawn.exit,plan.collection,0),request(plan.endpoint.deposit,plan.collection,0),request(plan.collection,plan.endpoint.deposit,context.paid.capacity),request(origin,destination,basis.observed.energy)];
}
export function continuationSpawnMatches(context: PaidUnitContext,basis: PaidCourierOpening): boolean {
  if (basis.continuation.stage !== 'spawning') return true;
  const creep = Game.creeps[context.paid.request],placement = creep?.memory.birthPlacement;
  const spawn = Object.values(Game.spawns).find(spawn => spawn.id === context.plan.spawn.id);
  return !!placement && validWorldPosition(placement.exit) && withinRange(placement.exit,context.plan.spawn.exit,0) && placement.spawn === context.plan.spawn.id
    && spawn?.spawning?.name === context.paid.request && spawn.spawning.remainingTime === context.paid.activeAt-Game.time;
}
