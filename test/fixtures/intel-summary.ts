import { adjacentRoom } from '../../src/core/geometry/room-grid';
import { classifyIntelRoom } from '../../src/features/intel/classification';
import type { RoomSummary } from '../../src/features/intel/model';
export function intelSummary(observedAt = 10, room = 'W1N1'): RoomSummary {
  return { room, observedAt, status: 'normal', statusTimestamp: null, ...classifyIntelRoom(room),
    controller: { id: 'controller', x: 20, y: 20, level: 3, owned: true, owner: 'bot', reservation: null },
    sources: [{ id: 'source', x: 10, y: 10, capacity: 3000 }], mineral: { id: 'mineral', x: 30, y: 30, type: 'H' },
    structures: [{ id: 'spawn', x: 23, y: 23, type: 'spawn', owner: 'bot', owned: true, hostile: false },
      { id: 'tower', x: 25, y: 25, type: 'tower', owner: 'enemy', owned: false, hostile: true }],
    units: [{ id: 'own-unit', x: 24, y: 24, owner: 'bot', owned: true, power: false },
      { id: 'enemy-unit', x: 26, y: 26, owner: 'enemy', owned: false, power: false },
      { id: 'power-unit', x: 27, y: 27, owner: 'ally', owned: false, power: true }],
    exits: [{ direction: 3, room: adjacentRoom(room, 3) }, { direction: 5, room: adjacentRoom(room, 5) }] };
}
