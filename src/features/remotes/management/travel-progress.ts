import { openState, peekState, saveState } from '../../../persistence/versioned-state';
import type { StatePort, StateSchema } from '../../../persistence/versioned-state';
import { stateKey } from '../../../persistence/state-key';
import { natural, object } from '../assignment-validation';
import { validWorldPosition as position } from '../../../core/geometry/world-position';
import type { StaticTravelLeg } from '../../../capabilities/movement/path-model';
export type RemoteTravelLeg = StaticTravelLeg;
interface Progress { revision: number; clock: number; identity: string; legs: RemoteTravelLeg[] }
/** One active source per home; completed quotes own their final result, so cache namespaces cannot grow per source. */
export function createRemoteTravelProgress(state: StatePort, home: string) {
  const key = stateKey('remoteTravel',home), read = () => peekState(state,key,schema) ?? schema.initial();
  return { read,save(expected: number, tick: number, identity: string, legs: RemoteTravelLeg[]): boolean {
    const current = read();
    if (current.revision !== expected || tick < current.clock) return false;
    const record = { revision: expected+1,clock: tick,identity,legs };
    if (!schema.valid(record)) throw new Error('Invalid remote travel progress');
    openState(state,key,schema); saveState(state,key,schema,record); return true;
  } };
}
const schema: StateSchema<Progress> = { owner: 'remotes',version: 2,migrations: { 1: migrate },initial: () => ({ revision: 0,clock: 0,identity: '',legs: [] }),
  valid(value: unknown): value is Progress {
    return validProgress(value,4);
  } };
function leg(value: unknown): value is RemoteTravelLeg {
  return object(value) && typeof value.ticks === 'number' && Number.isFinite(value.ticks) && value.ticks >= 0 && natural(value.operations) && position(value.arrival);
}

function validProgress(value: unknown, maximumLegs: number): value is Progress {
  return object(value) && natural(value.revision) && natural(value.clock) && typeof value.identity === 'string' && value.identity.length <= 100000
    && Array.isArray(value.legs) && value.legs.length <= maximumLegs && value.legs.every(leg);
}
function migrate(value: unknown): Progress {
  if (!validProgress(value,3)) throw new Error('Invalid legacy remote travel progress');
  return { ...value,identity: '',legs: [] };
}
