import { natural, room } from '../assignment-validation';
export interface RemoteConstructionIdentity { home: string; room: string; generation: number }
export const remoteConstructionPrefix = 'remote-construction:';
export function remoteConstructionOwner(identity: RemoteConstructionIdentity): string {
  if (!room(identity.home) || !room(identity.room) || identity.home === identity.room || !natural(identity.generation) || identity.generation === 0) throw new Error('Invalid construction identity');
  return remoteConstructionPrefix+JSON.stringify([identity.home,identity.room,identity.generation]);
}
export function remoteConstructionIdentity(owner: string): RemoteConstructionIdentity | undefined {
  if (!owner.startsWith(remoteConstructionPrefix) || owner.length > 1024) return undefined;
  try {
    const value: unknown = JSON.parse(owner.slice(remoteConstructionPrefix.length));
    if (!validTuple(value)) return undefined;
    return { home: value[0],room: value[1],generation: value[2] };
  } catch { return undefined; }
}

function validTuple(value: unknown): value is [string,string,number] {
  return Array.isArray(value) && value.length === 3 && room(value[0]) && room(value[1]) && value[0] !== value[1] && natural(value[2]) && value[2] > 0;
}
