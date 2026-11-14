import type { ObservationSource, RoomObservation } from '../../world/model';
export function createObservationSource(game: Pick<Game, 'rooms'>): ObservationSource {
  return {
    visibleRooms: () => Object.keys(game.rooms),
    observeRoom(name: string): RoomObservation {
      const room = game.rooms[name];
      if (!room) throw new Error(`Room is no longer visible: ${name}`);
      return {
        name,
        owned: room.controller?.my === true,
        units: room.find(FIND_CREEPS).map(unit => ({ id: unit.id, owner: unit.owner.username, owned: unit.my })),
        structures: room.find(FIND_STRUCTURES).map(structure => ({
          id: structure.id,
          type: structure.structureType,
          owned: 'my' in structure && structure.my === true,
        })),
      };
    },
  };
}
