import { openState, saveState } from '../../persistence/versioned-state';
import type { StatePort, StateSchema } from '../../persistence/versioned-state';
import { stateKey } from '../../persistence/state-key';
interface Sequence { next: number }
const schema: StateSchema<Sequence> = {
  owner: 'population', version: 1, initial: () => ({ next: 1 }), migrations: {},
  valid(value: unknown): value is Sequence {
    return !!value && typeof value === 'object' && 'next' in value
      && Number.isSafeInteger(value.next) && (value.next as number) > 0;
  },
};
/** Reserve before enqueue: crashes may skip numbers, never reuse a successful reservation. */
export function reserveSpawnIdentity(port: StatePort, room: string): string {
  if (!/^[WE]\d+[NS]\d+$/.test(room)) throw new Error('Invalid spawn identity room');
  const key = stateKey('spawn-identities', room);
  const state = openState(port, key, schema);
  const next = state.next + 1;
  if (!Number.isSafeInteger(next)) throw new Error('Spawn identity sequence exhausted');
  saveState(port, key, schema, { next });
  return 'ed-' + room + '-' + state.next;
}
