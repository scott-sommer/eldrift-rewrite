import { runRoomPlanning } from './stamp-room-bot';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
export function loop() {
  const memory = Memory as Memory & { retainedStampPlan?: string };
  if (Game.time === 100) {
    memory.retainedStampPlan = JSON.stringify(createMemoryPort(() => Memory).read('planning/W0N1'));
  }
  runRoomPlanning('stamps', Game.time >= 100 ? { planningStampTotalAttempts: 1 } : {});
}
