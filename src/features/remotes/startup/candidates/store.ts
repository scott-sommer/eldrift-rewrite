import { openState, peekState, saveState } from '../../../../persistence/versioned-state';
import type { StatePort, StateSchema } from '../../../../persistence/versioned-state';
import { stateKey } from '../../../../persistence/state-key';
import { natural, room } from '../../assignment-validation';
import { validCandidateRecord } from './validation';
import type { StartupCandidateEntry, StartupCandidateRecord, StartupCandidateWrite } from './model';
export function createStartupCandidateStore(state: StatePort, home: string) {
  if (!room(home)) throw new Error('Invalid startup candidate home');
  const key = stateKey('remoteStartupCandidates',home);
  const schema: StateSchema<StartupCandidateRecord> = { owner: 'remotes',version: 1,migrations: {},
    initial: () => ({ home,revision: 0,clock: 0,entries: [] }),valid: (value): value is StartupCandidateRecord => validCandidateRecord(value,home) };
  const read = () => peekState(state,key,schema) ?? schema.initial();
  function save(expected: number, tick: number, entries: StartupCandidateEntry[]): StartupCandidateWrite {
    if (!natural(expected) || !natural(tick)) throw new Error('Invalid startup candidate write');
    const current = read();
    if (current.revision !== expected || tick < current.clock) return 'conflict';
    const next = { home,revision: expected+1,clock: tick,entries };
    if (entries.length > 16 || JSON.stringify(next).length > 1048576 || entries.some(entry => entry.inputIdentity.length > 262144)) return 'capacity';
    if (!schema.valid(next)) throw new Error('Invalid startup candidate entry');
    openState(state,key,schema); saveState(state,key,schema,next); return 'saved';
  }
  return { read,save };
}
