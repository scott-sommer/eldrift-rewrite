import { requireCheckpoint } from '../checkpoints/validation';
import { startupFlowCount } from '../flow';
import { laborTotals } from '../household/labor/funding';
import { startupOutsideExpenseThrough } from '../cash-expenses';
import type { prepareStartupHomeProject } from './input';
import type { StartupHomeCheckpoint } from './checkpoint-model';
export function validateHomeCheckpointLinks(input: ReturnType<typeof prepareStartupHomeProject>,saved: StartupHomeCheckpoint): void {
  const timeline = saved.timeline,settled = saved.sources.flatMap(source => source.settled);
  const delivered = settled.reduce((sum,receipt) => sum+receipt.energy,0);
  requireCheckpoint([timeline.tick,timeline.accounting.tick,saved.sink.through+1].every(value => value === saved.tick));
  requireCheckpoint(timeline.funding.bank === timeline.accounting.state.endingEnergy);
  requireCheckpoint(timeline.accounting.state.birthEnergy === timeline.births.reduce((sum,birth) => sum+birth.cost,0));
  requireCheckpoint(timeline.accounting.openingConstructionEnergy === 0);
  requireCheckpoint(saved.sink.acceptedEnergy === saved.sources.reduce((sum,source) => sum+source.delivery.deliveredEnergy,0));
  const expected = new Set([...input.spawning.cash.flows.map(flow => flow.id),...input.spawning.requests.map(request => 'birth:'+request.id),...settled.map(receipt => receipt.id)]);
  requireCheckpoint(timeline.receiptCount === settled.length && expected.size === timeline.receiptIds.length && timeline.receiptIds.every(id => expected.has(id)));
  const passive = input.spawning.cash.flows.filter(flow => flow.kind === 'delivery').reduce((sum,flow) => sum+flow.energy*startupFlowCount(flow,0,saved.tick-1),0);
  requireCheckpoint(timeline.accounting.state.deliveredEnergy === delivered+passive);
  validateSink(input,saved,delivered);
}
function validateSink(input: ReturnType<typeof prepareStartupHomeProject>,saved: StartupHomeCheckpoint,delivered: number): void {
  const changes = input.sink.changes.reduce((sum,flow) => sum+(flow.kind === 'release' ? 1 : -1)*flow.energy*startupFlowCount(flow,0,saved.tick-1),0);
  let released = 0;
  if (saved.household) {
    const household = saved.household,labor = laborTotals(household.labor);
    requireCheckpoint(household.through+1 === saved.tick && household.endpointReceivedEnergy === delivered);
    const picked = household.redistribution.trips.reduce((sum,trip) => sum+trip.picked,0);
    released = picked+startupOutsideExpenseThrough(input.spawning.cash.flows,saved.tick-1)+labor.picked-labor.returned;
  }
  requireCheckpoint(saved.sink.free === input.sink.freeCapacity+changes+released-saved.sink.acceptedEnergy);
}
