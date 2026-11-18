import type { StatePort } from '../../persistence/versioned-state';
import { openState, peekState, saveState } from '../../persistence/versioned-state';
import { copyPlain } from '../../persistence/plain-data';
import { scoutControlsSchema, validScoutControl } from './scout-control-schema';
import type { ScoutControl } from './scout-control-model';
const key = 'scout-control/empire';
export function createScoutControlStore(port: StatePort) {
  const read = () => peekState(port,key,scoutControlsSchema) ?? scoutControlsSchema.initial();
  return { read,
    save(value: ScoutControl): void {
      const snapshot = copyPlain(value);
      if (!validScoutControl(snapshot)) throw new Error('Invalid scout control');
      const state = read(), previous = state.units.find(unit => unit.id === snapshot.id);
      if (previous && previous.home !== snapshot.home) throw new Error('Scout control owner changed');
      state.units = state.units.filter(unit => unit.id !== snapshot.id);
      state.units.push(snapshot);
      if (!scoutControlsSchema.valid(state)) throw new Error('Scout control capacity exceeded');
      openState(port,key,scoutControlsSchema);
      saveState(port,key,scoutControlsSchema,state);
    },
    remove(id: string): void {
      const state = read();
      if (!state.units.some(unit => unit.id === id)) return;
      state.units = state.units.filter(unit => unit.id !== id);
      saveState(port,key,scoutControlsSchema,state);
    },
  };
}
export function initialScoutControl(id: string, home: string, room: string, tick: number): ScoutControl {
  const state: ScoutControl = { id, home, room, phase: 'stabilize', retries: 0, wakeAt: 0, expiresAt: Number.MAX_SAFE_INTEGER,
    objective: null, assigned: [], assignmentIndex: 0, enteredAt: tick, visited: false, lastTick: null,
    lastPosition: null, previousRoom: null, transitionAt: null, stuck: 0, oscillations: 0,
    moving: false, escapeCursor: 0, avoidUntil: {} };
  if (!validScoutControl(state)) throw new Error('Invalid initial scout control');
  return state;
}
