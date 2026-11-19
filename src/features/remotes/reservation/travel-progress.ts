import { openState, peekState, saveState } from '../../../persistence/versioned-state';
import type { StatePort, StateSchema } from '../../../persistence/versioned-state';
import { stateKey } from '../../../persistence/state-key';
import { natural, object } from '../assignment-validation';
import { validWorldPosition } from '../../../core/geometry/world-position';
import type { StaticTravelLeg } from '../../../capabilities/movement/path-model';
interface Progress { revision: number; clock: number; identity: string; legs: StaticTravelLeg[] }
/** One active controller quote per home; source quotes retain their independent cache and schema. */
export function createReservationTravelProgress(state: StatePort, home: string) {
  const key = stateKey('remoteReserveTravel',home), read = () => peekState(state,key,schema) ?? schema.initial();
  return { read,save(expected: number, tick: number, identity: string, legs: StaticTravelLeg[]): boolean {
    const current = read();
    if (current.revision !== expected || tick < current.clock) return false;
    const next = { revision: expected+1,clock: tick,identity,legs };
    if (!schema.valid(next)) throw new Error('Invalid controller travel progress');
    openState(state,key,schema); saveState(state,key,schema,next); return true;
  } };
}
const schema: StateSchema<Progress> = { owner: 'remotes',version: 1,migrations: {},initial: () => ({ revision: 0,clock: 0,identity: '',legs: [] }),
  valid(value: unknown): value is Progress {
    return object(value) && natural(value.revision) && natural(value.clock) && typeof value.identity === 'string' && value.identity.length <= 100000
      && Array.isArray(value.legs) && value.legs.length <= 2 && value.legs.every(leg);
  } };
function leg(value: unknown): value is StaticTravelLeg {
  return object(value) && typeof value.ticks === 'number' && Number.isFinite(value.ticks) && value.ticks >= 0 && natural(value.operations) && validWorldPosition(value.arrival);
}
