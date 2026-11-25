import { laborBody } from './body';
import { natural, validateLabor } from './validation';
import type { BodyPart } from '../../../../spawning/body';
import type { HouseholdLaborJob } from './model';
export interface HouseholdLaborQuoteInput {
  job: Omit<HouseholdLaborJob,'energy' | 'workTicks'>; body: readonly BodyPart[];
  horizon: number; maximumLoad: number; maximumWorkTicks: number;
  /** Requested unboosted progress for build/upgrade, missing hits for repair. Not a future guarantee. */
  remainingWork: number;
}
/** Task-bounded alternative to fixed-load jobs; quoting grants no spawn or work authority. */
export function quoteHouseholdLaborJob(input: HouseholdLaborQuoteInput) {
  validateLabor({ horizon: input.horizon,jobs: [{ ...input.job,energy: 1,workTicks: 1 }] }); validateBounds(input);
  const body = laborBody(input.body,input.job.kind);
  if (!body.capacity || !body.rate) return deferred('body');
  if (input.job.outboundTicks+input.job.returnTicks > 0 && !body.mobile) return deferred('body');
  if (!input.remainingWork) return deferred('complete');
  const first = input.job.pickupAt+1+input.job.outboundTicks, available = input.horizon-input.job.returnTicks-first;
  const opportunities = Math.min(input.maximumWorkTicks,available);
  if (opportunities < 1) return deferred('horizon');
  const demand = input.job.kind === 'repair' ? Math.ceil(input.remainingWork/100) : input.remainingWork;
  const energy = Math.min(input.maximumLoad,body.capacity,demand,opportunities*body.rate);
  return { status: 'ready' as const,strategy: 'task-bounded' as const,job: { ...input.job,energy,workTicks: Math.ceil(energy/body.rate) } };
}
function validateBounds(input: HouseholdLaborQuoteInput): void {
  if (!natural(input.remainingWork) || input.remainingWork > 1000000000) throw new Error('Invalid household workload');
  if (!natural(input.maximumLoad) || input.maximumLoad < 1 || input.maximumLoad > 2500) throw new Error('Invalid household work load limit');
  if (!natural(input.maximumWorkTicks) || input.maximumWorkTicks < 1 || input.maximumWorkTicks > 1500) throw new Error('Invalid household work window limit');
}
function deferred(reason: 'body' | 'complete' | 'horizon') { return { status: 'deferred' as const,reason }; }
