import { createRuntime } from './runtime';
import type { RoomFeature, RuntimePorts } from './runtime-model';
export function createGameLoop(features: readonly RoomFeature[], ports: RuntimePorts, beforeTick: () => boolean = () => true, afterTick: () => void = () => {}): () => void {
  const runtime = createRuntime(features, ports);
  let dispatchedTick: number | undefined;
  function report(error: unknown, id: string, room?: string): void {
    try {
      ports.reportFailure({ id, tick: ports.clock().tick, error, ...(room === undefined ? {} : { room }) });
    } catch { /* A broken sink must not throw through the engine loop. */ }
  }
  return () => {
    try {
      if (!beforeTick()) return;
      const result = runtime.tick();
      if (dispatchedTick === result.world.tick) return;
      dispatchedTick = result.world.tick;
      try { afterTick(); } catch (error) { report(error, 'dispatch'); }
      for (const failure of result.world.failures) report(failure.error, 'observation', failure.room);
    } catch (error) {
      report(error, 'runtime');
    }
  };
}
