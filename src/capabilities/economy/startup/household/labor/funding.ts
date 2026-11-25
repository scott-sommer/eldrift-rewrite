import { validateLabor, requireLabor } from './validation';
import type { StartupHouseholdInput } from '../model';
import type { HouseholdLaborCheckpoint, HouseholdLaborInput, HouseholdLaborJob } from './model';
import type { StartupCashFlow } from '../../cash-model';
export function validateFundedLabor(input: StartupHouseholdInput): void {
  if (input.labor === undefined) {
    if (input.endpointCapacity !== undefined) throw new Error('Endpoint capacity requires labor model');
    return;
  }
  validateLabor(input.labor);
  if (!input.spawning.funding.energyLayout?.regeneration || input.labor.horizon !== input.spawning.cash.horizon) throw new Error('Labor requires passive physical household horizon');
  if (!Number.isSafeInteger(input.endpointCapacity) || input.endpointCapacity! < input.endpointEnergy || input.endpointCapacity! > 1000000000) throw new Error('Invalid labor endpoint capacity');
  for (const job of input.labor.jobs) validatePaidJob(input,job);
}
function validatePaidJob(input: StartupHouseholdInput, job: HouseholdLaborJob): void {
  const request = input.spawning.requests.find(request => request.id === job.request);
  if (!request?.body.includes('work') || !request.body.includes('carry')) throw new Error('Labor needs paid WORK/CARRY request');
  if (job.outboundTicks+job.returnTicks > 0 && !request.body.includes('move')) throw new Error('Traveling labor needs MOVE');
  if (input.redistribution.trips.some(trip => trip.request === job.request)) throw new Error('Labor and redistribution share a body');
}

export function laborTotals(saved?: Pick<HouseholdLaborCheckpoint,'jobs'>) {
  return (saved?.jobs ?? []).reduce((sum,job) => ({ picked: sum.picked+job.picked,spent: sum.spent+job.spent,returned: sum.returned+job.returned,lost: sum.lost+job.lost,cargo: sum.cargo+job.cargo }),{ picked: 0,spent: 0,returned: 0,lost: 0,cargo: 0 });
}
export function laborFlows(input: HouseholdLaborInput | undefined, saved: HouseholdLaborCheckpoint | undefined): StartupCashFlow[] {
  if (!input || !saved) return [];
  return saved.jobs.flatMap((state,index) => {
    if (!state.spent) return [];
    const job = input.jobs[index]!, count = Math.floor(state.spent/state.rate), remainder = state.spent%state.rate;
    const base = { id: 'household-work:'+job.id,kind: job.kind === 'build' ? 'home-construction' as const : 'upkeep' as const,spending: 'outside-spawn' as const };
    const flows: StartupCashFlow[] = count ? [{ ...base,id: base.id+':full',energy: state.rate,firstTick: state.workAt!,interval: 1,occurrences: count }] : [];
    if (remainder) flows.push({ ...base,id: base.id+':last',energy: remainder,firstTick: state.workAt!+count,interval: null,occurrences: 1 });
    return flows;
  });
}
export function laborConstruction(input: HouseholdLaborInput | undefined, saved: HouseholdLaborCheckpoint | undefined): number {
  return laborFlows(input,saved).filter(flow => flow.kind === 'home-construction').reduce((sum,flow) => sum+flow.energy*flow.occurrences,0);
}
export function validateFullLabor(saved: HouseholdLaborCheckpoint): void {
  for (const state of saved.jobs) {
    if (!state.picked) continue;
    const through = Math.min(saved.through,state.expiresAt!-1,state.stopAt!-1);
    const expected = Math.min(state.picked,Math.max(0,through-state.workAt!+1)*state.rate);
    requireLabor(state.spent === expected);
  }
}
