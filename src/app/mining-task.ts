import type { Outcome } from '../core/execution/model';
import type { Position } from '../capabilities/movement/step';
import type { MiningStation } from '../capabilities/mining/station';
import { stationTile } from '../capabilities/mining/station';
import type { StatePort } from '../persistence/versioned-state';
import { createStationAssignments } from '../features/mining/assignments';
import { createStationStore } from '../features/mining/station-store';
import type { TaskBehavior } from './task-runner';
import { taskScope } from './task-runner';
export interface MiningTaskPayload { room: string; station: string; tile: Position }
export function validMiningPayload(value: unknown): value is MiningTaskPayload {
  if (!value || typeof value !== 'object') return false;
  const payload = value as MiningTaskPayload;
  if (typeof payload.room !== 'string' || !payload.room || typeof payload.station !== 'string' || !payload.station) return false;
  try { stationTile(payload.tile); return payload.tile.room === payload.room; } catch { return false; }
}
export interface MiningTaskPorts<Context> {
  clock(): number;
  unit(context: Context): string;
  run(context: Context, station: MiningStation, tile: Position, assigned: boolean, owner: string): Outcome;
}
/** Mining waits are continuous work, not failed attempts; task expiry still bounds its lifetime. */
export function createMiningTaskBehavior<Context>(state: StatePort, ports: MiningTaskPorts<Context>): TaskBehavior<Context> {
  const assignments = createStationAssignments(state);
  return {
    phases: ['work'], validPayload: validMiningPayload,
    handlers: task => ({ work: context => {
      const payload = task.payload as MiningTaskPayload;
      const tick = ports.clock();
      const observed = createStationStore(state, payload.room).read(tick);
      const station = observed.stations.find(item => item.id === payload.station);
      if (!station) return observed.visible ? { status: 'failed', reason: 'station-removed' } : { status: 'running' };
      if (!station.access.some(tile => stationTile(tile) === stationTile(payload.tile))) return { status: 'failed', reason: 'station-access-removed' };
      const owner = taskScope(ports.unit(context), task.id);
      const assigned = assignments.acquire(station, payload.tile, ports.unit(context), owner, tick, 2);
      const outcome = ports.run(context, station, payload.tile, assigned, owner);
      return outcome.status === 'blocked' ? { status: 'running' } : outcome;
    } }),
  };
}
