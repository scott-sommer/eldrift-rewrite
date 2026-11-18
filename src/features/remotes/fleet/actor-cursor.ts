import { openState, peekState, saveState } from '../../../persistence/versioned-state';
import type { StatePort, StateSchema } from '../../../persistence/versioned-state';
import { stateKey } from '../../../persistence/state-key';
const schema: StateSchema<{ after: string | null }> = { owner: 'remotes',version: 1,migrations: {},initial: () => ({ after: null }),
  valid: (value: unknown): value is { after: string | null } => !!value && typeof value === 'object' && 'after' in value
    && (value.after === null || typeof value.after === 'string' && value.after.length <= 256) };
export function createRemoteActorCursor(state: StatePort, scope = 'empire') {
  const key = stateKey('remoteActors',scope);
  return { order<T extends { name: string }>(input: readonly T[]): T[] {
    const after = (peekState(state,key,schema) ?? schema.initial()).after, sorted = [...input].sort((a,b) => a.name.localeCompare(b.name));
    const start = after === null ? 0 : Math.max(0,sorted.findIndex(item => item.name.localeCompare(after) > 0));
    return [...sorted.slice(start),...sorted.slice(0,start)];
  },save(after: string): void { openState(state,key,schema); saveState(state,key,schema,{ after }); } };
}
