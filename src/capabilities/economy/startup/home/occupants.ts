import { tileKey } from '../../../movement/traffic/model';
import type { StartupProjectMotionInput } from '../courier-trips/project-model';
export function startupHomeOccupants(blockers: StartupProjectMotionInput['blockers'],tick: number) {
  const active = new Map<string,StartupProjectMotionInput['blockers'][number]>();
  for (const blocker of blockers) {
    if (blocker.startAt > tick || tick >= blocker.endAt) continue;
    const previous = active.get(blocker.unit);
    if (previous && tileKey(previous.position) !== tileKey(blocker.position)) throw new Error('Conflicting home occupant');
    active.set(blocker.unit,blocker);
  }
  return [...active.values()].map(blocker => ({ unit: blocker.unit,position: blocker.position }));
}
