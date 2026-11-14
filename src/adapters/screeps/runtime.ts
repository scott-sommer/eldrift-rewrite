import type { Failure } from '../../core/scheduling/model';
import { createObservationSource } from './observations';
export function createGamePorts() {
  return {
    observations: {
      visibleRooms: () => Object.keys(Game.rooms),
      observeRoom: (name: string) => createObservationSource(Game).observeRoom(name),
    },
    clock: () => ({ tick: Game.time, tickLimit: Game.cpu.tickLimit, bucket: Game.cpu.bucket }),
    usedCpu: () => Game.cpu.getUsed(),
    reportFailure(failure: Failure): void {
      const detail = failure.error instanceof Error ? failure.error.stack : String(failure.error);
      console.log(`[${failure.tick}] ${failure.id} ${failure.room ?? ''}: ${detail}`);
    },
  };
}
