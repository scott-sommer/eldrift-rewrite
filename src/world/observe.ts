import type { ObservationFailure, ObservationSource, RoomObservation, RoomView, StructureObservation, TickView } from './model';
function indexRoom(room: RoomObservation, allies: ReadonlySet<string>): RoomView {
  const structuresByType = new Map<string, StructureObservation[]>();
  for (const structure of room.structures) {
    const group = structuresByType.get(structure.type) ?? [];
    group.push(structure);
    structuresByType.set(structure.type, group);
  }
  return {
    ...room,
    ownUnits: room.units.filter(unit => unit.owned),
    allies: room.units.filter(unit => !unit.owned && allies.has(unit.owner)),
    threats: room.units.filter(unit => !unit.owned && !allies.has(unit.owner)),
    structuresByType,
  };
}
export function observeTick(tick: number, source: ObservationSource, alliesForRoom: (name: string) => readonly string[]): TickView {
  const rooms = new Map<string, RoomView>();
  const failures: ObservationFailure[] = [];
  for (const name of new Set(source.visibleRooms())) {
    try {
      rooms.set(name, indexRoom(source.observeRoom(name), new Set(alliesForRoom(name))));
    } catch (error) {
      failures.push({ room: name, error });
    }
  }
  return { tick, rooms, ownedRooms: [...rooms.values()].filter(room => room.owned), failures };
}
export function createTickObserver(source: ObservationSource, alliesForRoom: (name: string) => readonly string[]) {
  let cached: TickView | undefined;
  return {
    read(tick: number): TickView {
      if (cached?.tick !== tick) cached = observeTick(tick, source, alliesForRoom);
      return cached;
    },
  };
}
