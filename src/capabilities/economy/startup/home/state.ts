import { StartupProjectSource } from '../project-source';
import { startupProjectCouriers } from '../initial';
import type { prepareStartupHomeProject } from './input';
import type { StartupHomeCheckpoint } from './checkpoint-model';
import type { StartupScheduledBirth } from '../spawn-model';
import type { StartupProjectReceipt } from '../checkpoints/project-model';
import type { StartupCourierTrip } from '../courier-trips/model';
export function startupHomeSources(input: ReturnType<typeof prepareStartupHomeProject>,saved: StartupHomeCheckpoint | undefined,births: StartupScheduledBirth[],tick: number) {
  return input.sources.map((source,index) => {
    const wire = saved?.sources[index];
    const state = wire ? new StartupProjectSource(source.input,{ ...wire,tick,timeline: { births } }) : new StartupProjectSource(source.input);
    const workers = wire ? wire.couriers.map(worker => ({ ...worker,nextAt: worker.nextAt ?? Infinity })) : startupProjectCouriers(source.input,[]);
    return { ...source,state,workers,trips: wire?.trips ?? [] as StartupCourierTrip[],settled: wire?.settled ?? [] as StartupProjectReceipt[] };
  });
}
export function startupHomeDue(saved: StartupHomeCheckpoint | undefined) {
  const due = new Map<number,{ source: string; receipt: StartupProjectReceipt }[]>();
  for (const source of saved?.sources ?? []) for (const receipt of source.due) {
    const rows = due.get(receipt.tick) ?? []; rows.push({ source: source.id,receipt }); due.set(receipt.tick,rows);
  }
  return due;
}
