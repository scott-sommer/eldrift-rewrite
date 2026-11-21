import { requireCheckpoint } from '../checkpoints/validation';
import type { StartupTimelineCheckpoint } from '../checkpoints/timeline';
import type { StartupSpawnInput } from '../spawn-model';
import type { StartupCashFlow } from '../cash-model';
export function validateEnergyFundingCheckpoint(input: StartupSpawnInput, saved: StartupTimelineCheckpoint, result: { available: number; deposited: number }): void {
  const events = saved.energy!.events;
  requireCheckpoint(events.every(event => event.tick < saved.tick));
  const charges = events.filter(event => event.kind === 'charge');
  requireCheckpoint(charges.length === saved.births.length);
  charges.forEach((event,index) => {
    const birth = saved.births[index]!;
    requireCheckpoint(event.holder === birth.request && event.spawn === birth.spawn && event.energy === birth.cost && event.tick === birth.startAt);
  });
  let accessible = input.funding.initialEnergy, from = 0;
  for (const event of events) {
    accessible = Math.max(0,accessible-expenses(input,from,event.tick)); from = event.tick+1;
    accessible += event.kind === 'charge' ? -event.energy : event.energy;
    requireCheckpoint(accessible >= 0);
  }
  accessible = Math.max(0,accessible-expenses(input,from,saved.tick-1));
  requireCheckpoint(saved.funding.accessible === accessible && accessible <= result.available);
  requireCheckpoint(saved.funding.refilledEnergy === result.deposited && saved.funding.unfilledEnergy === 0);
}
function expenses(input: StartupSpawnInput, from: number, through: number): number {
  if (from > through) return 0;
  return input.cash.flows.filter(flow => flow.kind !== 'delivery').reduce((sum,flow) => sum+flow.energy*occurrences(flow,from,through),0);
}
function occurrences(flow: StartupCashFlow, from: number, through: number): number {
  if (flow.interval === null) return from <= flow.firstTick && flow.firstTick <= through ? 1 : 0;
  const first = Math.max(0,Math.ceil((from-flow.firstTick)/flow.interval));
  const last = Math.min(flow.occurrences-1,Math.floor((through-flow.firstTick)/flow.interval));
  return Math.max(0,last-first+1);
}
