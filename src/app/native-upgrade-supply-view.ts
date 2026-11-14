import { observeHauling } from '../adapters/screeps/hauling-observation';
import type { LogisticsRequest } from '../capabilities/logistics/request';
import { upgradeSupplyTarget } from '../features/work/upgrade-supply-identity';
/** Ownership and live capacity/reserve govern admission; inactive storage can have zero deposit capacity. */
export function createNativeUpgradeSupplyView(reserve: (home: string) => number): typeof observeHauling {
  return (creep, request, expectedSinkRoom) => {
    const view = observeHauling(creep, request, expectedSinkRoom);
    if (!request.owner.startsWith('upgrade-supply:')) return view;
    const home = creep.memory.population?.home ?? '';
    const target = upgradeSupplyTarget(request.owner, home);
    if (!validDestination(target, request)) return { ...view, sourceStock: 0, sinkFree: 0, sinkStatus: 'missing' };
    return { ...view, sourceStock: Math.min(view.sourceStock, availableStock(home, request.source, reserve(home))) };
  };
}
function validDestination(target: string | undefined, request: LogisticsRequest): boolean {
  if (!target || request.resource !== 'energy') return false;
  const room = Game.rooms[target];
  return !!room?.controller?.my && !!room.storage?.my && room.storage.id === request.sink;
}
function availableStock(home: string, id: string, reserve: number): number {
  const room = Game.rooms[home];
  const source = room?.storage;
  if (!source?.my || !room?.controller?.my || source.id !== id) return 0;
  return Math.max(0, source.store.energy - reserve);
}
