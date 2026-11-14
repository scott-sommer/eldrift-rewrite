import { observeHauling } from '../adapters/screeps/hauling-observation';
import { observeSupportStores, observeSupportSinks } from '../adapters/screeps/support-observation';
import { supportSources, supportSinks } from '../features/recovery/support-endpoints';
import { isSupportScope, supportTarget } from '../features/recovery/support-identity';
/** Apply live donor reserves at both admission and every task execution observation. */
export function createNativeSupportView(reserve: (home: string) => number): typeof observeHauling {
  return (creep, request, expectedSinkRoom) => {
    const view = observeHauling(creep, request, expectedSinkRoom);
    if (!isSupportScope(request.owner)) return view;
    const home = creep.memory.population?.home ?? '';
    const sink = destination(request.owner, home, request.sink);
    if (!sink || request.resource !== 'energy') return { ...view, sourceStock: 0, sinkFree: 0, sinkStatus: 'missing' };
    const source = supportSources(observeSupportStores(Game.rooms[home]), reserve(home)).find(item => item.id === request.source);
    return { ...view, sourceStock: Math.min(view.sourceStock, source?.amount ?? 0), sinkFree: Math.min(view.sinkFree, sink.free) };
  };
}
function destination(owner: string, home: string, id: string) {
  const target = supportTarget(owner, home);
  return supportSinks(observeSupportSinks(target ? Game.rooms[target] : undefined)).find(item => item.id === id);
}
