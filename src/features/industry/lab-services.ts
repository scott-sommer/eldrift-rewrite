import type { StatePort } from '../../persistence/versioned-state';
import { createQuantityReservations } from '../../persistence/quantities/store';
import { createLogisticsRequests } from '../logistics/request-store';
import { logisticsPool } from '../../capabilities/logistics/request';
import { reconcileServiceRequest } from '../logistics/service-request';
import type { ServiceTransfer } from '../logistics/service-request';
export function labServiceOwner(room: string,id: string): string { return 'industry-labs:'+room+':'+id; }
export interface LabService { lab: string; transfer: ServiceTransfer }
export function reconcileLabServices(state: StatePort,room: string,tick: number,desired: readonly LabService[],priority: number): void {
  const active = createLogisticsRequests(state,room).pending(tick).filter(request => request.owner.startsWith(labServiceOwner(room,'')));
  const owners = new Set([...active.map(request => request.owner),...desired.map(item => labServiceOwner(room,item.lab))]);
  for (const owner of owners) reconcileServiceRequest(state,room,tick,owner,priority,desired.find(item => labServiceOwner(room,item.lab) === owner)?.transfer);
}
/** Claimed work may carry cargo. Reconfiguration waits for its ordinary settlement/recovery, never clears tasks. */
export function labServicesBusy(state: StatePort,room: string,tick: number): boolean {
  const reserved = new Set(createQuantityReservations(state).list(tick).flatMap(claim => claim.allocations.map(item => item.pool)));
  return createLogisticsRequests(state,room).pending(tick).some(request => request.owner.startsWith(labServiceOwner(room,''))
    && reserved.has(logisticsPool('request',request.owner,request.id)));
}
