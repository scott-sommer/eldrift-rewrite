import { blocksMovement } from './structure-walkability';
import type { CostTile } from '../../capabilities/movement/costs';
export interface RoomCostObservation {
  readonly roads: readonly Readonly<CostTile>[];
  readonly obstacles: readonly Readonly<CostTile>[];
  readonly units: readonly Readonly<CostTile & { id: string }>[];
}
function collect(room: Room): RoomCostObservation {
  const structures = room.find(FIND_STRUCTURES);
  const obstacles: CostTile[] = structures.filter(blocksMovement).map(item => item.pos);
  obstacles.push(...room.find(FIND_SOURCES).map(item => item.pos));
  obstacles.push(...room.find(FIND_MINERALS).map(item => item.pos));
  obstacles.push(...room.find(FIND_DEPOSITS).map(item => item.pos));
  if (room.controller) obstacles.push(room.controller.pos);
  obstacles.push(...room.find(FIND_MY_CONSTRUCTION_SITES).filter(site => (OBSTACLE_OBJECT_TYPES as readonly string[]).includes(site.structureType)).map(site => site.pos));
  const units = [...room.find(FIND_CREEPS),...room.find(FIND_POWER_CREEPS)].map(unit => ({ id: unit.id,x: unit.pos.x,y: unit.pos.y }));
  return { roads: structures.filter(item => item.structureType === STRUCTURE_ROAD).map(item => item.pos),obstacles,units };
}
function detached(value: RoomCostObservation): RoomCostObservation {
  const tiles = (items: readonly CostTile[]) => Object.freeze(items.map(({ x,y }) => Object.freeze({ x,y })));
  return Object.freeze({ roads: tiles(value.roads),obstacles: tiles(value.obstacles),
    units: Object.freeze(value.units.map(({ id,x,y }) => Object.freeze({ id,x,y }))) });
}
/** Only immutable native geometry is shared, never movement costs, matrices or live authority. */
export function createRoomCostObservations(read = collect, clock = () => Game.time, maximumRooms = 256) {
  if (!Number.isSafeInteger(maximumRooms) || maximumRooms < 1) throw new Error('Invalid room observation bound');
  let tick: number | undefined;
  const rooms = new Map<string,{ room: Room; value: RoomCostObservation }>();
  return (room: Room): RoomCostObservation => {
    const now = clock();
    if (now !== tick) { rooms.clear(); tick = now; }
    const cached = rooms.get(room.name);
    if (cached?.room === room) return cached.value;
    const value = detached(read(room));
    if (!rooms.has(room.name) && rooms.size >= maximumRooms) rooms.delete(rooms.keys().next().value!);
    rooms.set(room.name,{ room,value });
    return value;
  };
}
export const nativeCostObservations = createRoomCostObservations();
