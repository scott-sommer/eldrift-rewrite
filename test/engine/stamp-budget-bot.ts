import { decodeCandidateProgress } from '../../src/features/planning/candidate-progress';
import { runRoomPlanning } from './stamp-room-bot';
import { resolveConfig } from '../../src/config/resolve';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import type { Envelope } from '../../src/persistence/versioned-state';
interface Progress {
  phase?: string;
  checkpoint?: { composition?: { totalAttempts: number; choices: number[] }; roads?: { connections: unknown[] }; hauling?: { routes: unknown[] }; service?: { routes: unknown[] } };
}
interface Job { checkpoint?: { pending?: { checkpoint?: Progress } } }
export function loop() {
  runRoomPlanning('stamps', { ...resolveConfig({}, Game.time).values, planningEnabled: true, layoutStrategy: 'stamps' });
  const job = (createMemoryPort(() => Memory).read('planning-jobs/W0N1') as Envelope | undefined)?.data as Job | undefined;
  const raw = job?.checkpoint?.pending?.checkpoint;
  const saved = raw ? decodeCandidateProgress(raw) as Progress : undefined;
  const memory = Memory as Memory & { stampBudgetRows?: unknown[] };
  (memory.stampBudgetRows ??= []).push({ tick: Game.time, phase: saved?.phase,
    defense: (saved?.checkpoint as { coordinator?: { generated?: unknown[] } } | undefined)?.coordinator?.generated?.length,
    flow: ((createMemoryPort(() => Memory).read('defense-search/W0N1') as Envelope | undefined)?.data as
      { checkpoint?: { flow?: { augmentations?: number } } } | undefined)?.checkpoint?.flow?.augmentations,
    attempts: saved?.checkpoint?.composition?.totalAttempts, depth: saved?.checkpoint?.composition?.choices.length,
    roads: saved?.checkpoint?.roads?.connections.length,
    hauling: saved?.checkpoint?.hauling?.routes.length, service: saved?.checkpoint?.service?.routes.length });
}
