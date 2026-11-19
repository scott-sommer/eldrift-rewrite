import { openState, peekState, saveState } from '../../../persistence/versioned-state';
import type { StatePort, StateSchema } from '../../../persistence/versioned-state';
import { stateKey } from '../../../persistence/state-key';
import { natural, object, room } from '../assignment-validation';
import type { RemoteCapacityRecord } from './model';
export function createRemoteCapacityStore(state: StatePort, home: string) {
  if (!room(home)) throw new Error('Invalid capacity home');
  const key = stateKey('remoteCapacity',home), schema = capacitySchema(home), read = () => peekState(state,key,schema) ?? schema.initial();
  return { read,save(expected: number, value: RemoteCapacityRecord): boolean {
    const current = read(); if (current.revision !== expected || value.clock < current.clock) return false;
    const next = { ...value,revision: expected+1 };
    if (!schema.valid(next)) throw new Error('Invalid remote capacity transition');
    openState(state,key,schema); saveState(state,key,schema,next); return true;
  } };
}
function capacitySchema(home: string): StateSchema<RemoteCapacityRecord> {
  return { owner: 'remotes',version: 1,migrations: {},initial: () => ({ home,revision: 0,clock: 0,supported: 3,evaluatedAt: null,observedLoad: null }),
    valid(value: unknown): value is RemoteCapacityRecord {
      if (!object(value) || value.home !== home || !natural(value.revision) || !natural(value.clock) || !natural(value.supported) || value.supported > 128) return false;
      return validEvaluation(value.evaluatedAt,value.clock) && validLoad(value.observedLoad);
    } };
}

function validEvaluation(value: unknown, clock: number): boolean {
  return value === null || natural(value) && value <= clock;
}
function validLoad(value: unknown): boolean {
  return value === null || typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}
