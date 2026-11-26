import { createStartupPlanningJob } from '../../../../features/remotes/startup/planning/runner';
import type { StartupPlanningQuery } from '../../../../features/remotes/startup/planning/model';
import type { StatePort } from '../../../../persistence/versioned-state';
import type { RemoteFleetProfile } from '../../../../features/remotes/fleet/model';
type StartupGuard = () => boolean;
/** Disposable prepared inputs only. Reset loses work, never approval or payment authority. One candidate per home. */
export function createEconomicProposalStaging(state: StatePort) {
  const entries = new Map<string,{ query: StartupPlanningQuery; revision: number }>();
  return {
    stage(home: string, query: StartupPlanningQuery): void {
      if (!entries.has(home) && entries.size >= 128) return;
      entries.set(home,{ query,revision: createStartupPlanningJob(state,home).read().revision });
    },
    resume(profile: Readonly<RemoteFleetProfile>, tick: number, frames: number, guard: StartupGuard) {
      const entry = entries.get(profile.home); if (!entry) return 'missing' as const;
      if (stale(entry.query,profile,tick)) { entries.delete(profile.home); return 'missing' as const; }
      if (entry.query.room !== profile.room || entry.query.source !== profile.source || !guard()) return 'waiting' as const;
      const planner = createStartupPlanningJob(state,profile.home), record = planner.read();
      if (record.revision !== entry.revision) { entries.delete(profile.home); return 'missing' as const; }
      if (record.clock >= tick) return 'waiting' as const;
      const progress = planner.advance({ ...entry.query,tick,expectedRevision: entry.revision },frames,guard);
      if (progress.frames === 0) return 'waiting' as const;
      entries.delete(profile.home); return 'seeded' as const;
    },
  };
}
function stale(query: StartupPlanningQuery, profile: Readonly<RemoteFleetProfile>, tick: number): boolean {
  const participants = new Set([...query.input.project.workers,...query.input.couriers].map(worker => worker.request));
  const first = Math.min(...query.input.project.spawning.requests.filter(request => participants.has(request.id)).map(request => request.readyAt));
  const changed = query.room === profile.room && query.source === profile.source && query.generation !== profile.generation;
  return tick > query.expiresAt || tick >= query.observedAt+first || changed;
}
export type EconomicProposalStaging = ReturnType<typeof createEconomicProposalStaging>;
