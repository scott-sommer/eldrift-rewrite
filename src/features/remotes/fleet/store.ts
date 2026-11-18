import { openState, peekState, saveState } from '../../../persistence/versioned-state';
import type { StatePort, StateSchema } from '../../../persistence/versioned-state';
import { stateKey } from '../../../persistence/state-key';
import { partCosts } from '../../../capabilities/spawning/body';
import { natural, object } from '../assignment-validation';
import { remoteFleetIdentity, remoteFleetOwner } from './identity';
import type { RemoteFleetProfile, RemoteFleetRecord } from './model';
export function createRemoteFleetStore(state: StatePort, home: string) {
  const key = stateKey('remoteFleet',home), schema = fleetSchema(home), read = () => peekState(state,key,schema) ?? schema.initial();
  return { read,save(expected: number, tick: number, actors: RemoteFleetProfile[], cursor?: number): boolean {
    const current = read();
    if (current.revision !== expected || tick < current.clock) return false;
    const next = { home,revision: expected+1,clock: tick,next: (cursor ?? current.next) % Math.max(1,actors.length),actors };
    if (!schema.valid(next)) throw new Error('Invalid remote fleet transition');
    openState(state,key,schema); saveState(state,key,schema,next); return true;
  } };
}
function fleetSchema(home: string): StateSchema<RemoteFleetRecord> {
  return { owner: 'remotes',version: 1,migrations: {},initial: () => ({ home,revision: 0,clock: 0,next: 0,actors: [] }),
    valid(value: unknown): value is RemoteFleetRecord {
      return object(value) && value.home === home && natural(value.revision) && natural(value.clock)
        && natural(value.next) && value.next <= 256
        && Array.isArray(value.actors) && value.actors.length <= 256 && value.actors.every(actor => profile(actor,home))
        && new Set(value.actors.map(actor => actor.owner)).size === value.actors.length;
    } };
}
function profile(value: unknown, home: string): value is RemoteFleetProfile {
  if (!object(value) || typeof value.owner !== 'string' || value.home !== home) return false;
  const identity = remoteFleetIdentity(value.owner);
  if (!identity || remoteFleetOwner(value as unknown as RemoteFleetProfile) !== value.owner) return false;
  if (!body(value.body)) return false;
  return metrics(value);
}
function metrics(value: Record<string,unknown>): boolean {
  return [value.generation,value.desired,value.travelTicks,value.marginTicks,value.retireTicks].every(natural) && Number(value.generation) > 0
    && Number(value.desired) <= 1000 && typeof value.priority === 'number' && Number.isFinite(value.priority);
}

function body(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0 && value.length <= 50 && value.every(part => typeof part === 'string' && Object.hasOwn(partCosts,part));
}
