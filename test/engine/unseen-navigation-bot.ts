import { loop as botLoop } from '../../src/main';
import { createMovementService } from '../../src/adapters/screeps/movement-service';
const movement = createMovementService();
declare global { interface Memory { unseenNavigation?: { visible: boolean[]; rooms: string[]; statuses: string[] } } }
export function loop() {
  botLoop();
  const evidence = Memory.unseenNavigation ??= { visible: [], rooms: [], statuses: [] };
  const creep = Game.creeps['explorer']!;
  evidence.visible.push(Game.rooms['E0N1'] !== undefined);
  evidence.rooms.push(creep.pos.roomName);
  const result = movement.move(creep, { owner: 'explore', destination: { room: 'E0N1', x: 1, y: 20 }, range: 0,
    policy: { version: 'explore', blockedRooms: [], costs: {}, maximumRooms: 2 } });
  evidence.statuses.push(result.status);
  const batch = movement.flush()!;
  if (batch.resolution.denied.length) throw new Error('Explorer denied');
}
