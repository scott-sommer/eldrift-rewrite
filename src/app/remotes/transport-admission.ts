import { logisticsPool } from '../../capabilities/logistics/request';
import type { LogisticsRequest } from '../../capabilities/logistics/request';
import type { TransferAvailability } from '../../capabilities/logistics/booking';
import { remoteTransportOwner } from '../../features/remotes/transport-authority';
import type { RemoteTransportDemand } from '../../features/remotes/transport-authority';
import { transportService } from './transport-service';
import type { RemoteTransportService } from './transport-service';
import type { NewHaulingTask } from '../submit-hauling-task';
export interface RemoteCollectionPolicy { minimumBatch: number; requestLifetime: number; service?: RemoteTransportService }
export interface RemoteCollectionTrip {
  home: string; name: string; unitId: string; actor: string; tick: number; demand: RemoteTransportDemand;
  source: string; sink: string; maximum: number;
}
/** Candidate only: current authority and physical eligibility remain the caller's responsibility; owners book before assignment. */
export function remoteCollectionAdmission(input: RemoteCollectionTrip, policy: RemoteCollectionPolicy,
  observe: (request: LogisticsRequest) => TransferAvailability): NewHaulingTask | undefined {
  validate(input,policy);
  if (input.demand.expiresAt <= input.tick) return undefined;
  const request: LogisticsRequest = { id: logisticsPool('remote-trip',input.unitId,input.sink,String(input.tick)),owner: remoteTransportOwner(input.demand,input.actor),
    source: input.source,sink: input.sink,resource: 'energy',quantity: input.maximum,priority: 0,
    expiresAt: Math.min(input.demand.expiresAt,input.tick+policy.requestLifetime),...(policy.service ? { service: transportService(policy.service) } : {}) };
  const observed = observe(request), available = { ...observed,minimumCollection: Math.max(observed.minimumCollection ?? 0,Math.min(policy.minimumBatch,input.maximum)) };
  return { home: input.home,name: input.name,unitId: input.unitId,tick: input.tick,request,phase: 'collect',maximum: input.maximum,sinkRoom: input.home,available };
}
function validate(input: RemoteCollectionTrip, policy: RemoteCollectionPolicy): void {
  if (![input.home,input.name,input.unitId,input.actor,input.source,input.sink,input.demand.id,input.demand.assignment,input.demand.room,input.demand.source]
    .every(value => typeof value === 'string' && value.length > 0) || input.home !== input.demand.home || input.demand.kind !== 'mine') throw new Error('Invalid remote collection identity');
  if (![input.tick,input.demand.expiresAt,input.tick+policy.requestLifetime].every(value => Number.isSafeInteger(value) && value >= 0)) throw new Error('Invalid remote collection clock');
  if (![input.maximum,policy.minimumBatch,policy.requestLifetime,input.demand.generation].every(value => Number.isSafeInteger(value) && value >= 1)) throw new Error('Invalid remote collection limits');
}
