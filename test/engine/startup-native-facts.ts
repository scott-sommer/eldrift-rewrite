import { createNativeStartupFacts } from '../../src/app/remotes/startup/facts';
import { movementPosition } from '../../src/adapters/screeps/movement-traffic';
import type { StatePort } from '../../src/persistence/versioned-state';
/** Scenario probe observes current native objects without creating planning facts or workers. */
export function snapshotStartupNativeFacts(state: StatePort, home: string) {
  const room = Game.rooms.E0N1, base = Game.rooms[home];
  const source = room?.find(FIND_SOURCES)[0], endpoint = base?.storage;
  const site = room?.find(FIND_MY_CONSTRUCTION_SITES).find(site => site.structureType === 'container');
  if (!source || !endpoint || !site || !base?.controller?.owner) throw new Error('Native startup facts probe requires ordinary source construction');
  const observe = createNativeStartupFacts(state,{ availableEnergy: (_home,available) => available });
  return observe({ tick: Game.time,home,room: room!.name,source: source.id,station: movementPosition(site.pos),endpoint: endpoint.id,username: base.controller.owner.username });
}
