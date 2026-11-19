import { openState, peekState, saveState } from '../../../persistence/versioned-state';
import type { StatePort, StateSchema } from '../../../persistence/versioned-state';
import { stateKey } from '../../../persistence/state-key';
import { natural, object, room } from '../assignment-validation';
import { validWorldPosition } from '../../../core/geometry/world-position';
import type { StaticTravelLeg } from '../../../capabilities/movement/path-model';
interface Progress { revision: number; clock: number; identity: string; legs: StaticTravelLeg[] }
interface Entry { room: string; identity: string; legs: StaticTravelLeg[] }
interface RecordData { revision: number; clock: number; entries: Entry[] }
/** Bounded controller-room caches avoid evicting another selected room during live admission. */
export function createReservationTravelProgress(state: StatePort, home: string, target: string) {
  if (!room(home) || !room(target) || home === target) throw new Error('Invalid controller travel scope');
  const key = stateKey('remoteReserveTravel',home), record = () => peekState(state,key,schema) ?? schema.initial();
  function read(): Progress {
    const current = record(), entry = current.entries.find(item => item.room === target);
    return { revision: current.revision,clock: current.clock,identity: entry?.identity ?? '',legs: entry?.legs ?? [] };
  }
  return { read,save(expected: number, tick: number, identity: string, legs: StaticTravelLeg[]): boolean {
    const current = record();
    if (current.revision !== expected || tick < current.clock) return false;
    const entries = [...current.entries.filter(entry => entry.room !== target),{ room: target,identity,legs }].slice(-64);
    const next = { revision: expected+1,clock: tick,entries };
    if (!schema.valid(next)) throw new Error('Invalid controller travel progress');
    openState(state,key,schema); saveState(state,key,schema,next); return true;
  } };
}
const schema: StateSchema<RecordData> = { owner: 'remotes',version: 2,migrations: { 1: migrate },initial: () => ({ revision: 0,clock: 0,entries: [] }),
  valid(value: unknown): value is RecordData {
    if (!object(value) || !natural(value.revision) || !natural(value.clock) || !Array.isArray(value.entries) || value.entries.length > 64) return false;
    return value.entries.every(entry) && new Set(value.entries.map(item => item.room)).size === value.entries.length;
  } };
function entry(value: unknown): value is Entry { return object(value) && room(value.room) && measurement(value); }
function measurement(value: Record<string,unknown>): boolean {
  return typeof value.identity === 'string' && value.identity.length <= 100000 && Array.isArray(value.legs) && value.legs.length <= 2 && value.legs.every(leg);
}
function leg(value: unknown): value is StaticTravelLeg {
  return object(value) && typeof value.ticks === 'number' && Number.isFinite(value.ticks) && value.ticks >= 0 && natural(value.operations) && validWorldPosition(value.arrival);
}
function migrate(value: unknown): RecordData {
  if (!object(value) || !natural(value.revision) || !natural(value.clock) || !measurement(value)) throw new Error('Invalid legacy controller travel progress');
  return { revision: value.revision,clock: value.clock,entries: [] };
}
