import type { GroundAttempt, GroundObservation } from '../../capabilities/logistics/ground-confirmation';
import { movementPosition } from './movement-traffic';
export function groundStock(position: RoomPosition, resource: ResourceConstant): number {
  return position.lookFor(LOOK_RESOURCES).filter(item => item.resourceType === resource).reduce((sum, item) => sum + item.amount, 0);
}
export function observeGroundRelease(attempt: GroundAttempt): GroundObservation {
  const room = Game.rooms[attempt.position.room];
  const creep = Game.getObjectById(attempt.unit as Id<Creep>);
  if (!room || !creep) return { tick: Game.time };
  const events = room.getEventLog();
  const isolated = events.every(event => event.objectId !== attempt.unit
    && !(event.data && 'targetId' in event.data && event.data.targetId === attempt.unit));
  const position = new RoomPosition(attempt.position.x, attempt.position.y, attempt.position.room);
  return { tick: Game.time, unit: creep.id, position: movementPosition(creep.pos), hits: creep.hits,
    cargo: creep.store.getUsedCapacity(attempt.resource as ResourceConstant), ground: groundStock(position, attempt.resource as ResourceConstant), isolated };
}
