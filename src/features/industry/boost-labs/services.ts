import type { StatePort } from '../../../persistence/versioned-state';
import { createQuantityReservations } from '../../../persistence/quantities/store';
import { createLogisticsRequests } from '../../logistics/request-store';
import { logisticsPool } from '../../../capabilities/logistics/request';
export function boostLabServiceOwner(home: string,lab: string): string { return 'industry-boost-labs:'+JSON.stringify([home,lab]); }
export function labTransferBusy(state: StatePort,home: string,owner: string,tick: number): boolean {
  const reserved = new Set(createQuantityReservations(state).list(tick).flatMap(claim => claim.allocations.map(item => item.pool)));
  return createLogisticsRequests(state,home).pending(tick).some(request => request.owner === owner && reserved.has(logisticsPool('request',owner,request.id)));
}
