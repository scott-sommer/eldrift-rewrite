import { laborBody } from './body';
import type { HouseholdLaborJob, HouseholdLaborState } from './model';
/** Completion includes the requested productive spend and settlement of remaining cargo. */
export function laborFulfilled(result: { labor?: { jobs: readonly HouseholdLaborState[] } }, required: readonly HouseholdLaborJob[]): boolean {
  return required.every(expected => {
    const job = result.labor?.jobs.find(item => item.id === expected.id);
    if (!job?.worker) return false;
    const body = laborBody(job.worker.body,expected.kind), spend = Math.min(expected.energy,body.capacity,body.rate*expected.workTicks);
    return job.phase === 'complete' && job.worker?.birth.request === expected.request
      && job.spent === spend && job.cargo === 0 && job.lost === 0;
  });
}
