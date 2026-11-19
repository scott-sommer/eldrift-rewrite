import { allocateSpawns } from '../../../capabilities/spawning/allocate';
import { bodyCost } from '../../../capabilities/spawning/body';
import type { SpawnRequest, SpawnSlot } from '../../../capabilities/spawning/request';
import type { SpawnLoadSample } from './model';
export interface SpawnPressureObservation {
  room: string; tick: number; slots: SpawnSlot[]; energy: number; capacity: number;
  names: ReadonlySet<string>; requests: SpawnRequest[];
}
/** Queue eligibility belongs to producers. This read-only proposal never re-enters effect admission. */
export function measureSpawnPressure(view: SpawnPressureObservation): SpawnLoadSample {
  const ready = view.requests.filter(request => request.room === view.room && request.readyAt <= view.tick
    && view.tick < request.expiresAt && !view.names.has(request.name) && bodyCost(request.body) <= view.capacity);
  const proposed = allocateSpawns(ready,view.slots,{ [view.room]: view.energy },view.names,view.tick,'skip');
  const selected = new Set(proposed.map(assignment => assignment.request.id));
  const remaining = view.energy-proposed.reduce((sum,assignment) => sum+assignment.cost,0);
  const busy = view.slots.filter(slot => slot.busy).length;
  const free = view.slots.length-busy-proposed.length;
  const unaffordable = ready.filter(request => !selected.has(request.id) && bodyCost(request.body) > remaining).length;
  return { busy,starved: Math.min(free,unaffordable),spawns: view.slots.length };
}
