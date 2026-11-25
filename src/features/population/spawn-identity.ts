import { openState, peekState, saveState } from '../../persistence/versioned-state';
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

/** Prospective identity only; another producer may reserve it before publication. */
export function peekSpawnIdentity(port: StatePort, room: string): string {
  if (!/^[WE]\d+[NS]\d+$/.test(room)) throw new Error('Invalid spawn identity room');
  const next = peekState(port,stateKey('spawn-identities',room),schema)?.next ?? 1;
  if (!Number.isSafeInteger(next+1)) throw new Error('Spawn identity sequence exhausted');
  return 'ed-'+room+'-'+next;
}
/** Synchronous checked reservation preserves the identity already used by a forecast. */
export function reserveExpectedSpawnIdentity(port: StatePort, room: string, expected: string): string | undefined {
  if (peekSpawnIdentity(port,room) !== expected) return undefined;
  return reserveSpawnIdentity(port,room);
}
