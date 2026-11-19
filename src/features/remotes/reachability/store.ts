import { openState, peekState, saveState } from '../../../persistence/versioned-state';
import type { StatePort, StateSchema } from '../../../persistence/versioned-state';
import { stateKey } from '../../../persistence/state-key';
import { room } from '../assignment-validation';
import { validReachabilityRecord } from './validation';
import { observeRemoteReachability } from './observe';
import type { ReachabilityObservation, ReachabilityRecord } from './model';
export function createRemoteReachabilityStore(state: StatePort, home: string) {
  if (!room(home)) throw new Error('Invalid reachability home');
  const key = stateKey('remoteReachability',home), schema = reachabilitySchema(home), read = () => peekState(state,key,schema) ?? schema.initial();
  return { read,observe(expected: number, tick: number, units: readonly ReachabilityObservation[]): boolean {
    const current = read(); if (current.revision !== expected) return false;
    const observed = observeRemoteReachability(current,tick,units); if (!observed) return false;
    const next = { ...observed,revision: expected+1 };
    if (!schema.valid(next)) throw new Error('Invalid reachability transition');
    if (read().revision !== expected) return false;
    openState(state,key,schema); saveState(state,key,schema,next); return true;
  } };
}
function reachabilitySchema(home: string): StateSchema<ReachabilityRecord> {
  return { owner: 'remotes',version: 1,migrations: {},initial: () => ({ home,revision: 0,clock: 0,attempts: [],sources: [],blocked: [] }),
    valid: (value): value is ReachabilityRecord => validReachabilityRecord(value,home) };
}
