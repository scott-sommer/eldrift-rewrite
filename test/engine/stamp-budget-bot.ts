import { runRoomPlanning } from './stamp-room-bot';
import { resolveConfig } from '../../src/config/resolve';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import type { Envelope } from '../../src/persistence/versioned-state';
interface Progress {
  phase?: string;
  checkpoint?: { composition?: { totalAttempts: number; choices: number[] }; roads?: { connections: unknown[] } };
}
interface Job { checkpoint?: { pending?: { checkpoint?: Progress } } }
export function loop() {
  runRoomPlanning('stamps', { ...resolveConfig({}, Game.time).values, planningEnabled: true, layoutStrategy: 'stamps' });
  const job = (createMemoryPort(() => Memory).read('planning-jobs/W0N1') as Envelope | undefined)?.data as Job | undefined;
  const saved = job?.checkpoint?.pending?.checkpoint;
  const memory = Memory as Memory & { stampBudgetRows?: unknown[] };
  (memory.stampBudgetRows ??= []).push({ tick: Game.time, phase: saved?.phase,
    attempts: saved?.checkpoint?.composition?.totalAttempts, depth: saved?.checkpoint?.composition?.choices.length,
    roads: saved?.checkpoint?.roads?.connections.length });
}
