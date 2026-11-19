import { openState, peekState, saveState } from '../../../../persistence/versioned-state';
import type { StatePort, StateSchema } from '../../../../persistence/versioned-state';
import { stateKey } from '../../../../persistence/state-key';
import { natural, object, room } from '../../assignment-validation';
import { validReservationQuote } from '../quote-validation';
import type { ReservationCandidate, ReservationSelectionRecord } from './model';
export function createReservationSelectionStore(state: StatePort, home: string) {
  if (!room(home)) throw new Error('Invalid reservation selection home');
  const key = stateKey('remoteReservationPolicy',home), schema = selectionSchema(home);
  const read = () => peekState(state,key,schema) ?? schema.initial();
  return { read,save(expected: number, value: ReservationSelectionRecord): boolean {
    const previous = read();
    if (previous.revision !== expected || value.clock < previous.clock) return false;
    const next = { ...value,revision: expected+1 };
    if (!schema.valid(next)) throw new Error('Invalid reservation selection transition');
    openState(state,key,schema); saveState(state,key,schema,next); return true;
  } };
}
function selectionSchema(home: string): StateSchema<ReservationSelectionRecord> {
  return { owner: 'remotes',version: 1,migrations: {},initial: () => ({ home,revision: 0,clock: 0,identity: '',next: 0,entries: [],published: [] }),
    valid(value: unknown): value is ReservationSelectionRecord {
      if (!object(value) || value.home !== home || !natural(value.revision) || !natural(value.clock)) return false;
      if (typeof value.identity !== 'string' || value.identity.length > 100000 || !natural(value.next) || value.next > 64) return false;
      return validCollections(value,home,value.clock);
    } };
}
function validEntries(value: unknown, home: string, tick: number): value is ReservationCandidate[] {
  if (!Array.isArray(value) || value.length > 64 || new Set(value.map(item => object(item) ? item.room : '')).size !== value.length) return false;
  return value.every(item => validEntry(item,home,tick));
}
function validEntry(value: unknown, home: string, tick: number): boolean {
  if (!object(value) || !room(value.room) || value.room === home) return false;
  if (value.checkedAt !== null && (!natural(value.checkedAt) || value.checkedAt > tick)) return false;
  if (value.quote === null) return true;
  return value.checkedAt !== null && validReservationQuote(value.quote,home,value.room,Number(value.checkedAt));
}

function validCollections(value: Record<string,unknown>, home: string, tick: number): boolean {
  if (!validEntries(value.entries,home,tick) || !validEntries(value.published,home,tick)) return false;
  const next = Number(value.next), entries = value.entries, published = value.published;
  if (entries.length === 0 ? next !== 0 : next >= entries.length) return false;
  return published.length === 0 || published.map(entry => entry.room).join(',') === entries.map(entry => entry.room).join(',');
}
