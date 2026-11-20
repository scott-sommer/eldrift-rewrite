import { peekState, openState, saveState } from '../../../persistence/versioned-state';
import type { StatePort, StateSchema } from '../../../persistence/versioned-state';
import { stateKey } from '../../../persistence/state-key';
import { natural, object, room } from '../assignment-validation';
import { selectionBinding, validStartupSelection } from './selection-validation';
import type { RemoteFleetProfile } from '../fleet/model';
import type { StartupSelectionRecord, StartupSelectionProposal } from './selection-model';
/** Per-home bounded geometry evidence; callers must freshly derive the binding before each lookup. */
export function createStartupSelections(state: StatePort, home: string) {
  if (!room(home)) throw new Error('Invalid startup selection home');
  const key = stateKey('remoteStartupSelections',home), schema = selectionSchema(home);
  const read = () => peekState(state,key,schema) ?? schema.initial();
  function save(expected: number, tick: number, selections: StartupSelectionRecord['selections']): boolean {
    const current = read();
    if (current.revision !== expected || tick < current.clock) return false;
    const next = { revision: expected+1,clock: tick,selections };
    if (!schema.valid(next)) return false;
    openState(state,key,schema); saveState(state,key,schema,next); return true;
  }
  return { read,
    publish(expected: number, tick: number, proposal: StartupSelectionProposal): boolean {
      if (!natural(tick)) throw new Error('Invalid startup selection tick');
      if (!validStartupSelection({ ...proposal,selectedAt: tick },home,tick)) throw new Error('Invalid startup geometry selection');
      const { identity,plan,legs,operations } = proposal.quote;
      const quote = { status: 'complete' as const,identity,plan,legs,operations };
      const selection = { generation: proposal.generation,binding: proposal.binding,expiresAt: proposal.expiresAt,selectedAt: tick,quote };
      const selections = read().selections.filter(item => item.expiresAt >= tick && !sameSource(item.quote.plan,proposal.quote.plan));
      return save(expected,tick,[...selections,selection]);
    },
    withdraw(expected: number, tick: number, target: { room: string; source: string }): boolean {
      if (!natural(tick)) throw new Error('Invalid startup selection tick');
      return save(expected,tick,read().selections.filter(item => item.expiresAt >= tick && !sameSource(item.quote.plan,target)));
    },
    lookup(profile: Readonly<RemoteFleetProfile>, binding: string, tick: number) {
      if (!natural(tick) || !selectionBinding(binding)) throw new Error('Invalid startup selection context');
      const record = read();
      if (profile.home !== home || tick < record.clock) return undefined;
      return record.selections.find(item => sameSource(item.quote.plan,profile) && item.generation === profile.generation && item.binding === binding
        && item.selectedAt <= tick && tick <= item.expiresAt && JSON.stringify(item.quote.plan[profile.kind]) === JSON.stringify(profile.body));
    },
  };
}
function sameSource(a: { room: string; source: string }, b: { room: string; source: string }): boolean { return a.room === b.room && a.source === b.source; }
function selectionSchema(home: string): StateSchema<StartupSelectionRecord> {
  return { owner: 'remotes',version: 1,migrations: {},initial: () => ({ revision: 0,clock: 0,selections: [] }),
    valid(value: unknown): value is StartupSelectionRecord {
      if (!object(value) || !natural(value.revision) || !natural(value.clock) || !Array.isArray(value.selections)) return false;
      if (value.selections.length > 128 || JSON.stringify(value).length > 131072) return false;
      if (!value.selections.every(item => validStartupSelection(item,home,Number(value.clock)))) return false;
      return new Set(value.selections.map(item => JSON.stringify([item.quote.plan.room,item.quote.plan.source]))).size === value.selections.length;
    } };
}
