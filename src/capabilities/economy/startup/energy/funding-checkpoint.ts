import { startupFlowCount } from '../flow';
import { requireCheckpoint, record } from '../checkpoints/validation';
import type { StartupTimelineCheckpoint } from '../checkpoints/timeline';
import type { StartupSpawnInput } from '../spawn-model';
export function validateEnergyFundingCheckpoint(input: StartupSpawnInput, saved: StartupTimelineCheckpoint, result: { available: number; deposited: number; ambientEnergy?: number }): void {
  if (input.funding.energyLayout?.regeneration) validateAmbientLinks(input,saved,result.ambientEnergy);
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
  return input.cash.flows.filter(flow => flow.kind !== 'delivery' && flow.spending !== 'outside-spawn').reduce((sum,flow) => sum+flow.energy*startupFlowCount(flow,from,through),0);
}

function validateAmbientLinks(input: StartupSpawnInput, saved: StartupTimelineCheckpoint, ambientEnergy: number | undefined): void {
  requireCheckpoint(record(saved.accounting.state));
  requireCheckpoint(expenses(input,0,saved.tick-1) === 0);
  const stock = saved.energy!.points.reduce((sum,point) => sum+point.energy,0);
  requireCheckpoint(saved.funding.bank >= stock && saved.accounting.state.minimumEnergy >= 0);
  requireCheckpoint(saved.accounting.state.homeConstructionEnergy === scheduledExpense(input,'home-construction',saved.tick-1));
  requireCheckpoint(saved.accounting.state.upkeepEnergy >= scheduledExpense(input,'upkeep',saved.tick-1));
  requireCheckpoint(saved.energy!.ambientThrough === saved.tick-1);
  requireCheckpoint(saved.accounting.state.ambientEnergy === ambientEnergy);
}

function scheduledExpense(input: StartupSpawnInput, kind: string, through: number): number {
  return input.cash.flows.filter(flow => flow.kind === kind).reduce((sum,flow) => sum+flow.energy*startupFlowCount(flow,0,through),0);
}
