import type { Position } from '../../../capabilities/movement/step';
import { remoteServiceTiming } from '../../../capabilities/economy/remote-timing';
import type { RemoteInfrastructureRecord } from './model';
/** Full loaded route cost bounds every source-route prefix; no unseen tile is priced as plain terrain. */
export function remoteConstructionTravel(record: RemoteInfrastructureRecord, lifetime: number, margin: number,
  cost: (position: Position) => number | undefined, guard: () => boolean) {
  const draft = record.draft;
  if (!draft?.routes.length || draft.routes.length !== draft.sources.length) return undefined;
  let maximum = 0;
  for (const route of draft.routes) {
    let ticks = 0;
    for (const point of route.path) {
      if (!guard()) return undefined;
      const value = cost(point);
      if (value === undefined || !Number.isFinite(value) || value < 1) return undefined;
      ticks += value;
    }
    maximum = Math.max(maximum,Math.ceil(ticks));
  }
  const timing = remoteServiceTiming(lifetime,maximum,maximum,margin);
  return timing.replacementTicks > 0 ? timing : undefined;
}
