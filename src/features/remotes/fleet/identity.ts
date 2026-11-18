import { room } from '../assignment-validation';
import type { RemoteFleetIdentity } from './model';
export function remoteFleetOwner(identity: RemoteFleetIdentity): string {
  return 'remote-fleet:' + JSON.stringify([identity.home,identity.room,identity.source,identity.kind]);
}
export function remoteFleetIdentity(owner: string): RemoteFleetIdentity | undefined {
  if (!owner.startsWith('remote-fleet:') || owner.length > 1024) return undefined;
  try {
    const fields: unknown = JSON.parse(owner.slice('remote-fleet:'.length));
    if (!tuple(fields)) return undefined;
    return { home: fields[0],room: fields[1],source: fields[2],kind: fields[3] };
  } catch { return undefined; }
}

function tuple(value: unknown): value is [string,string,string,'miner' | 'courier'] {
  return Array.isArray(value) && value.length === 4 && room(value[0]) && room(value[1]) && source(value[2]) && ['miner','courier'].includes(value[3]);
}
function source(value: unknown): value is string { return typeof value === 'string' && value.length > 0 && value.length <= 256; }
