import type { MovementCommand } from './movement-service';
import { validWorldPosition } from '../../core/geometry/world-position';
import { withinRange } from '../../capabilities/movement/path-model';
import { canStandAt } from './service-position';
import type { Outcome } from '../../core/execution/model';
import type { NativeTransferCommand, TransferObject } from './transfer-target';
/** No transfer journal or native action may precede exact service validation. */
export function inspectTransferService(command: NativeTransferCommand, target: TransferObject | null): Outcome | undefined {
  const service = command.service;
  if (service === undefined) return undefined;
  const endpoint = target ? { room: target.pos.roomName,x: target.pos.x,y: target.pos.y } : command.position;
  if (!validWorldPosition(service) || !withinRange(service,endpoint,1)) return { status: 'failed',reason: 'transfer-service-mismatch' };
  const room = Game.rooms[service.room];
  if (room && !canStandAt(room,service)) return { status: 'blocked',reason: 'transfer-service-unavailable',retryAt: Game.time+1 };
  return undefined;
}

export function transferApproach(command: NativeTransferCommand, target: TransferObject | null): MovementCommand {
  const endpoint = target ? { room: target.pos.roomName,x: target.pos.x,y: target.pos.y } : command.position;
  return { owner: command.owner,destination: command.service ?? endpoint,range: command.service ? 0 : 1,policy: command.policy,...(command.avoid ? { avoid: command.avoid } : {}) };
}
