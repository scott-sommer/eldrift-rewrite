import type { EmpireFeatureContext } from './runtime-model';
import type { ObservationStore } from '../features/intel/observation/store';
import type { ObservationUnit } from '../features/intel/observation/model';
import { refreshObservations } from '../features/intel/observation/refresh';
export function refreshNativeObservers(context: EmpireFeatureContext, units: readonly ObservationUnit[],
  store: ObservationStore, maximumReads: number, enabled: (home: string) => boolean, guard: () => boolean): number {
  if (!maximumReads || !guard()) return 0;
  const homes = [...new Set(units.map(unit => unit.home))].sort(), cursor = store.read().homeCursor;
  const index = cursor === null ? 0 : homes.findIndex(home => home > cursor), start = index < 0 ? 0 : index;
  let scanned = 0, last: string | undefined;
  for (const home of [...homes.slice(start), ...homes.slice(0, start)]) {
    if (scanned >= maximumReads || !guard()) break;
    const config = context.rooms.get(home)?.values;
    if (config && enabled(home)) scanned += refreshObservations(home, config, context.world.tick, maximumReads - scanned, store, guard).scanned;
    last = home;
  }
  if (last !== undefined) {
    const current = store.read();
    store.update(current.revision, saved => { saved.homeCursor = last; });
  }
  return scanned;
}
