import type { StatePort, StateSchema } from '../../persistence/versioned-state';
import { peekState } from '../../persistence/versioned-state';
import { reconcileLabAssignment } from './lab-assignment';
import { labServicesBusy } from './lab-services';
interface LabReplans { pending: string[] }
const key = 'industry-lab-maintenance/empire';
const schema: StateSchema<LabReplans> = {
  owner: 'industry',version: 1,initial: () => ({ pending: [] }),migrations: {},
  valid(value: unknown): value is LabReplans {
    if (!value || typeof value !== 'object') return false;
    const pending = (value as LabReplans).pending;
    return Array.isArray(pending) && pending.length <= 50 && new Set(pending).size === pending.length
      && pending.every(home => typeof home === 'string' && /^[WE]\d+[NS]\d+$/.test(home));
  },
};
export function pendingLabReplans(state: StatePort): readonly string[] { return peekState(state,key,schema)?.pending ?? []; }
/** The owning feature accepts intents without clearing its live assignment or another owner's work. */
export function requestLabReplans(state: StatePort,homes: readonly string[]): boolean {
  const previous = pendingLabReplans(state), pending = [...new Set([...previous,...homes])].sort();
  if (!schema.valid({ pending })) throw new Error('Invalid pending lab replan scope');
  if (JSON.stringify(pending) === JSON.stringify(previous)) return false;
  state.write(key,{ owner: schema.owner,version: schema.version,data: { pending } }); return true;
}
/** Return true for the whole drain tick, so no replacement work is admitted before the next tick. */
export function settleLabReplan(state: StatePort,home: string,tick: number): boolean {
  const pending = pendingLabReplans(state); if (!pending.includes(home)) return false;
  reconcileLabAssignment(state,home,tick,[],null);
  if (!labServicesBusy(state,home,tick)) state.write(key,{ owner: schema.owner,version: schema.version,data: { pending: pending.filter(room => room !== home) } });
  return true;
}
