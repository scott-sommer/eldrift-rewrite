import { loop as botLoop } from '../../src/main';
import { createMovementService } from '../../src/adapters/screeps/movement-service';
const movement = createMovementService();
const targets = {
  east: { room: 'E0N1', x: 1, y: 20 }, west: { room: 'W0N1', x: 48, y: 25 },
  south: { room: 'W1S0', x: 20, y: 1 }, north: { room: 'W1N0', x: 25, y: 48 },
};
export function loop() {
  botLoop();
  const memory = Memory as Memory & { exitEvidence?: Record<string, (string | number)[][]> };
  memory.exitEvidence ??= {};
  for (const [name, destination] of Object.entries(targets)) {
    const creep = Game.creeps[name]!;
    (memory.exitEvidence[name] ??= []).push([creep.pos.roomName, creep.pos.x, creep.pos.y]);
    const outcome = movement.move(creep, { owner: 'navigation-fixture', destination, range: 0,
      policy: { version: 'test', blockedRooms: [], costs: {}, maximumRooms: 4 } });
    if (memory.exitEvidence[name]!.length === 3 && outcome.status !== 'done') throw new Error('Arrival not recognized');
    if (!['running', 'done'].includes(outcome.status)) throw new Error(JSON.stringify(outcome));
  }
  const batch = movement.flush()!;
  if (batch.outcomes.some(result => !('intent' in result) || result.intent.status !== 'issued')) throw new Error('Dispatch failed');
  if (movement.flush() !== batch) throw new Error('Duplicate dispatch');
  if (batch.resolution.denied.length) throw new Error(JSON.stringify(batch.resolution.denied));
}

