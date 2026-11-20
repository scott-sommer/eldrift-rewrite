import type { LogisticsRequest } from '../../../capabilities/logistics/request';
import { validateLogisticsRequest } from '../../../capabilities/logistics/request';
import { sameLogisticsService } from '../../../capabilities/logistics/service';
import { withinRange } from '../../../capabilities/movement/path-model';
import type { Position } from '../../../capabilities/movement/step';
import type { StartupTravelPlan } from './travel-model';
import { startupTravelLegs } from './travel-plan';
/** Explicit energy endpoints only; native authority, stock/capacity and route admission remain separate owners. */
export function bindStartupHauling(request: LogisticsRequest, plan: StartupTravelPlan, station: { source: string; id: string; position: Position }): LogisticsRequest {
  validateLogisticsRequest(request); startupTravelLegs(plan);
  if (request.resource !== 'energy' || request.source !== station.id || request.sink !== plan.endpoint.id) throw new Error('Startup hauling endpoint mismatch');
  if (station.source !== plan.source || !withinRange(station.position,plan.station,0)) throw new Error('Startup hauling station mismatch');
  const service = { collection: { ...plan.collection },deposit: { ...plan.endpoint.deposit },avoid: [{ ...plan.station }] };
  if (request.service && !sameLogisticsService(request.service,service)) throw new Error('Startup hauling already bound');
  return { ...request,service };
}
