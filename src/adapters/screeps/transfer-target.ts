import type { TransferAttempt } from '../../capabilities/logistics/confirmation';
import type { Position } from '../../capabilities/movement/step';
import type { RoutePolicy } from '../../capabilities/movement/room-route';
export type TransferObject = AnyStoreStructure | Tombstone | Ruin | Resource | Creep | PowerCreep;
export interface NativeTransferCommand {
  owner: string;
  attemptId: string;
  requestKey?: string;
  target: string;
  position: Position;
  resource: ResourceConstant;
  kind: TransferAttempt['kind'];
  maximum: number;
  policy: RoutePolicy;
}
export function transferAmounts(creep: Creep, target: TransferObject, command: NativeTransferCommand) {
  if (command.kind === 'pickup') return pickupAmounts(creep, target, command.resource);
  if (command.kind === 'withdraw') return withdrawAmounts(creep, target, command.resource);
  return deliveryAmounts(creep, target, command.resource);
}
function pickupAmounts(creep: Creep, target: TransferObject, resource: ResourceConstant) {
  if (!('resourceType' in target) || target.resourceType !== resource) return undefined;
  return { available: target.amount, capacity: creep.store.getFreeCapacity(resource) ?? 0 };
}
function withdrawAmounts(creep: Creep, target: TransferObject, resource: ResourceConstant) {
  if (!('store' in target) || 'body' in target || 'powers' in target) return undefined;
  return { available: target.store.getUsedCapacity(resource) ?? 0, capacity: creep.store.getFreeCapacity(resource) ?? 0 };
}
function deliveryAmounts(creep: Creep, target: TransferObject, resource: ResourceConstant) {
  if (!('store' in target) || !('structureType' in target || 'body' in target || 'powers' in target)) return undefined;
  return { available: creep.store.getUsedCapacity(resource) ?? 0, capacity: target.store.getFreeCapacity(resource) ?? 0 };
}
export function pickupExceedsReservation(command: NativeTransferCommand, amounts: ReturnType<typeof transferAmounts>): boolean {
  return command.kind === 'pickup' && !!amounts && Math.min(amounts.available, amounts.capacity) > command.maximum;
}
export function nativeTransferView(creep: Creep, target: TransferObject | null, command: NativeTransferCommand,
  amounts: ReturnType<typeof transferAmounts>): import('../../capabilities/resources/step').TransferView {
  return { tick: Game.time, complete: false,
    target: target ? 'visible' : Game.rooms[command.position.room] ? 'missing' : 'unseen',
    inRange: !!target && creep.pos.inRangeTo(target, 1), available: amounts?.available ?? 0,
    capacity: amounts?.capacity ?? 0, remaining: command.maximum };
}

