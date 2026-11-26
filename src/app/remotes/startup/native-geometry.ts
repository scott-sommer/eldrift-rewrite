import { canStandAt } from '../../../adapters/screeps/service-position';
import { movementPosition } from '../../../adapters/screeps/movement-traffic';
import { adjacentWorkTiles } from '../../../capabilities/movement/work-tiles';
import { createRemoteFleetStore } from '../../../features/remotes/fleet/store';
import { nearestStartupGeometry } from '../../../features/remotes/startup/geometry';
import type { StartupGeometryStrategy, StartupGeometryFacts } from '../../../features/remotes/startup/geometry';
import type { StatePort } from '../../../persistence/versioned-state';
import type { RemoteFleetProfile } from '../../../features/remotes/fleet/model';
/** Observe candidate geometry independently of route quoting, construction commitment and economic admission. */
export function createNativeStartupGeometry(state: StatePort, strategy: StartupGeometryStrategy = nearestStartupGeometry) {
  return (profile: Readonly<RemoteFleetProfile>) => {
    const home = Game.rooms[profile.home], room = Game.rooms[profile.room];
    if (!home?.controller?.my || !room) return undefined;
    const source = room.find(FIND_SOURCES).find(source => source.id === profile.source); if (!source) return undefined;
    const pair = bodies(state,profile); if (!pair) return undefined;
    const spawns = home.find(FIND_MY_SPAWNS).filter(spawn => spawn.isActive()).map(spawn => ({ id: spawn.id,position: movementPosition(spawn.pos) }));
    const endpoints = [home.storage,home.terminal].filter((item): item is StructureStorage | StructureTerminal => !!item?.my && item.isActive()).map(item => ({ id: item.id,position: movementPosition(item.pos) }));
    const facts = { home: home.name,room: room.name,source: { id: source.id,position: movementPosition(source.pos) },spawns,endpoints,stations: stations(room,source),...pair };
    return strategy(facts,point => { const current = Game.rooms[point.room]; return !!current && canStandAt(current,point); });
  };
}
function bodies(state: StatePort, profile: Readonly<RemoteFleetProfile>) {
  const profiles = createRemoteFleetStore(state,profile.home).read().actors.filter(item => item.room === profile.room && item.source === profile.source && item.generation === profile.generation && item.desired > 0);
  const miner = profiles.find(item => item.kind === 'miner'), courier = profiles.find(item => item.kind === 'courier');
  return miner && courier ? { miner: [...miner.body],courier: [...courier.body] } : undefined;
}
function stations(room: Room, source: Source): StartupGeometryFacts['stations'] {
  const containers = room.find(FIND_STRUCTURES).filter(item => item.structureType === STRUCTURE_CONTAINER), sites = room.find(FIND_MY_CONSTRUCTION_SITES).filter(site => site.structureType === STRUCTURE_CONTAINER);
  return adjacentWorkTiles(movementPosition(source.pos)).map(position => ({ position,status: at(containers,position) ? 'ready' as const : at(sites,position) ? 'building' as const : 'empty' as const }));
}
function at(items: readonly { pos: RoomPosition }[], point: { x: number; y: number }): boolean { return items.some(item => item.pos.x === point.x && item.pos.y === point.y); }
