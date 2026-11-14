import type { MiningStation } from '../capabilities/mining/station';
import { validateStation } from '../capabilities/mining/station';
import type { TaskDefinition } from '../persistence/tasks/schema';
import { taskSchema } from '../persistence/tasks/schema';
import { openState, saveState } from '../persistence/versioned-state';
import type { StatePort } from '../persistence/versioned-state';
import { stateKey } from '../persistence/state-key';
import { createStationAssignments } from '../features/mining/assignments';
import { taskScope } from './task-runner';
/** Existing work is preserved. A replacement without a free tile remains idle for later admission. */
export function assignMiningTask(port: StatePort, definitions: Readonly<Record<string, TaskDefinition>>,
  unit: string, station: MiningStation, tick: number, lifetime: number): string | undefined {
  validateStation(station);
  if (![tick, lifetime, tick + lifetime].every(Number.isSafeInteger) || tick < 0 || lifetime < 1) throw new Error('Invalid mining task lifetime');
  const schema = taskSchema(unit, definitions);
  const key = stateKey('tasks', unit);
  const state = openState(port, key, schema);
  if (state.queue.length > 0) return undefined;
  const id = 'mining:' + JSON.stringify([station.position.room, station.id, tick]);
  const scope = taskScope(unit, id);
  const assignments = createStationAssignments(port);
  const tile = station.access.find(candidate => assignments.acquire(station, candidate, unit, scope, tick, 2));
  if (!tile) return undefined;
  state.queue.push({ id, kind: 'mine', phase: 'work', payload: { room: station.position.room, station: station.id, tile },
    wakeAt: tick, retries: 0, expiresAt: tick + lifetime });
  try { saveState(port, key, schema, state); }
  catch (error) { assignments.release(scope); throw error; }
  return id;
}
