import type { StatePort } from '../../../persistence/versioned-state';
import type { BoostJob } from '../../../capabilities/industry/boosts/model';
import type { BoostLab } from '../../../capabilities/industry/boosts/supply';
import { boostScope, boostServiceOwner } from '../../../capabilities/industry/boosts/model';
import { logisticsPool } from '../../../capabilities/logistics/request';
import { createQuantityReservations } from '../../../persistence/quantities/store';
import { createLogisticsRequests } from '../../logistics/request-store';
import { reconcileServiceRequest } from '../../logistics/service-request';
export function reserveBoostStock(state: StatePort,job: BoostJob,lab: BoostLab,resource: string,mineral: number,energy: number,tick: number): boolean {
  const scope = boostScope(job.request), first = logisticsPool('stock',lab.id,resource), second = logisticsPool('stock',lab.id,'energy');
  return createQuantityReservations(state).reserve({ id: scope,owner: scope,holder: job.request.name,scope,expiresAt: job.request.expiresAt+1,
    allocations: [{ pool: first,amount: mineral },{ pool: second,amount: energy }] },{ [first]: lab.amount,[second]: lab.energy },tick);
}
export function releaseBoostStock(state: StatePort,job: BoostJob): void { createQuantityReservations(state).releaseScope(boostScope(job.request)); }
export function stopBoostService(state: StatePort,job: BoostJob,tick: number): boolean {
  const owner = boostServiceOwner(job.request);
  reconcileServiceRequest(state,job.request.home,tick,owner,0,undefined);
  const reserved = new Set(createQuantityReservations(state).list(tick).flatMap(claim => claim.allocations.map(item => item.pool)));
  return createLogisticsRequests(state,job.request.home).pending(tick).some(request => request.owner === owner && reserved.has(logisticsPool('request',owner,request.id)));
}
