import { logisticsPool } from '../capabilities/logistics/request';
import type { LogisticsRequest } from '../capabilities/logistics/request';
import { isSupportScope } from '../features/recovery/support-identity';
/** Admission gates do not discard already-carried deliveries. */
export function acceptsLocalLogistics(request: LogisticsRequest, home: string, recovery: boolean, upgradeService: boolean, master = false): boolean {
  if (isSupportScope(request.owner)) return false;
  if (request.owner === 'upgrade-service:' + home) return upgradeService && !recovery && !master;
  if (request.owner.endsWith(':recovery-bank')) return recovery && request.resource === 'energy';
  return !recovery || request.resource === 'energy';
}

export function localLogisticsDemand(request: LogisticsRequest, room: string, master: boolean): boolean {
  return !isSupportScope(request.owner) && request.owner !== logisticsPool('cargo-recovery', room)
    && !(master && request.owner === 'upgrade-service:' + room);
}
