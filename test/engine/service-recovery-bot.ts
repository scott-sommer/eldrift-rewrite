import { loop as botLoop } from '../../src/main';
import { createMovementService } from '../../src/adapters/screeps/movement-service';
let movement = createMovementService();
declare global {
  interface Memory {
    serviceRecovery?: { positions: number[][]; statuses: string[]; reasons: string[]; issued: number[]; fatigue: number[]; reset: boolean };
  }
}
export function loop() {
  botLoop();
  const evidence = Memory.serviceRecovery ??= { positions: [], statuses: [], reasons: [], issued: [], fatigue: [], reset: false };
  const creep = Game.creeps['walker']!;
  const command = { owner: 'loaded-hauler', destination: { room: 'W0N1', x: 22, y: 20 }, range: 0,
    policy: { version: 'local', blockedRooms: [], costs: {}, maximumRooms: 1 } };
  const outcome = movement.move(creep, command);
  evidence.positions.push([creep.pos.x, creep.pos.y]);
  evidence.statuses.push(outcome.status);
  evidence.reasons.push('reason' in outcome ? outcome.reason : '');
  evidence.fatigue.push(creep.fatigue);
  const duplicate = movement.move(creep, command);
  if (duplicate.status !== 'blocked') throw new Error('Duplicate request accepted');
  const damaged = movement.move(Game.creeps['blocker']!, command);
  if (damaged.status !== 'failed') throw new Error('Immobile creep accepted');
  const batch = movement.flush()!;
  evidence.issued.push(batch.outcomes.filter(result => 'intent' in result && result.intent.status === 'issued').length);
  if (outcome.status === 'done' && !evidence.reset) {
    movement = createMovementService();
    evidence.reset = true;
  }
}
