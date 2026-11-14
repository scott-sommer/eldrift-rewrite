import type { RecoveryRoom } from '../../capabilities/recovery/assessment';
export function observeRecoveryRoom(room: Room): RecoveryRoom {
  const storage = room.storage?.my ? room.storage.store.energy : 0;
  const terminal = room.terminal?.my ? room.terminal.store.energy : 0;
  return { room: room.name, owned: room.controller?.my === true, level: room.controller?.level ?? 0, energy: storage + terminal };
}
export function observeRecoveryDonors(target: Room) {
  return Object.values(Game.rooms).filter(room => room.controller?.my).map(room => ({ ...observeRecoveryRoom(room),
    distance: Game.map.getRoomLinearDistance(target.name, room.name) }));
}
