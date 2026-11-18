import { openState, peekState, saveState } from '../../../persistence/versioned-state';
import type { StatePort, StateSchema } from '../../../persistence/versioned-state';
import { stateKey } from '../../../persistence/state-key';
import { natural, object, room } from '../assignment-validation';
import type { RemoteDiscoveryRecord } from './model';
export function createRemoteDiscoveryStore(state: StatePort, home: string) {
  const key = stateKey('remoteDiscovery',home), schema = discoverySchema(home), read = () => peekState(state,key,schema) ?? schema.initial();
  return { read,save(expected: number, value: RemoteDiscoveryRecord): boolean {
    const previous = read();
    if (previous.revision !== expected || value.clock < previous.clock) return false;
    const next = { ...value,revision: expected+1 };
    if (!schema.valid(next)) throw new Error('Invalid remote discovery transition');
    openState(state,key,schema); saveState(state,key,schema,next); return true;
  } };
}
function discoverySchema(home: string): StateSchema<RemoteDiscoveryRecord> {
  return { owner: 'remotes',version: 1,migrations: {},initial: () => ({ home,revision: 0,clock: 0,identity: '',startedAt: 0,completedAt: null,
    next: 0,queue: [],seen: [],rooms: [],published: [],unknown: [],pending: null,truncated: false }),
    valid(value: unknown): value is RemoteDiscoveryRecord {
      if (!object(value) || value.home !== home || !clock(value) || typeof value.identity !== 'string' || value.identity.length > 100000) return false;
      if (!frontier(value)) return false;
      return collections(value) && pending(value.pending);
    } };
}
function clock(value: Record<string,unknown>): boolean {
  return [value.revision,value.clock,value.startedAt].every(natural) && Number(value.startedAt) <= Number(value.clock)
    && (value.completedAt === null || natural(value.completedAt) && value.completedAt <= Number(value.clock));
}
function rooms(value: unknown, maximum: number): value is string[] {
  return Array.isArray(value) && value.length <= maximum && value.every(room) && new Set(value).size === value.length;
}
function node(value: unknown): boolean { return object(value) && room(value.room) && natural(value.depth) && value.depth <= 8; }
function pending(value: unknown): boolean {
  return value === null || object(value) && natural(value.depth) && value.depth <= 8 && rooms(value.exits,4) && natural(value.next) && value.next <= value.exits.length;
}

function frontier(value: Record<string,unknown>): boolean {
  return Array.isArray(value.queue) && value.queue.length <= 65 && value.queue.every(node)
    && natural(value.next) && value.next <= value.queue.length && typeof value.truncated === 'boolean';
}

function collections(value: Record<string,unknown>): boolean {
  return rooms(value.seen,261) && rooms(value.rooms,64) && rooms(value.published,64) && rooms(value.unknown,65);
}
