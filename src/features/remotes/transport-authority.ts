import { logisticsPool } from '../../capabilities/logistics/request';
import type { LogisticsRequest } from '../../capabilities/logistics/request';
import { natural, room } from './assignment-validation';
import type { RemoteAssignmentDemand } from './assignment-model';
export type RemoteTransportDemand = Extract<RemoteAssignmentDemand, { kind: 'mine' }>;
export interface TransportAuthority { home: string; actor: string; id: string; assignment: string; generation: number }
export function remoteTransportOwner(demand: RemoteTransportDemand, actor: string): string {
  if (!actor) throw new Error('Remote transport actor is required');
  return logisticsPool('remote-transport',demand.home,actor,demand.id,demand.assignment,String(demand.generation));
}
export function remoteTransportAuthority(owner: string): TransportAuthority | undefined {
  const value = decode(owner);
  if (!Array.isArray(value) || value.length !== 6 || value[0] !== 'remote-transport') return undefined;
  if (!value.every(item => typeof item === 'string' && item.length > 0 && item.length <= 1024) || !room(value[1])) return undefined;
  const generation = Number(value[5]);
  if (!natural(generation) || generation < 1 || String(generation) !== value[5]) return undefined;
  return { home: value[1] as string,actor: value[2] as string,id: value[3] as string,assignment: value[4] as string,generation };
}
export function transportToken(request: LogisticsRequest) {
  const authority = remoteTransportAuthority(request.owner);
  return authority ? { ...authority,expiresAt: request.expiresAt } : undefined;
}

function decode(owner: string): unknown {
  if (typeof owner !== 'string' || !owner.startsWith('logistics:')) return undefined;
  try { return JSON.parse(owner.slice('logistics:'.length)); } catch { return undefined; }
}
