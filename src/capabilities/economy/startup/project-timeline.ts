import { createStartupSpawnTimeline } from './spawn-timeline';
import { createStartupHousehold } from './household/timeline';
import type { StartupHouseholdCheckpoint } from './household/model';
import type { StartupDeliveryInput } from './delivery-model';
import type { StartupProjectCheckpoint } from './checkpoints/project-model';
import type { StartupCashReceipt } from './cash-model';
export function createStartupProjectTimeline(input: StartupDeliveryInput, saved?: StartupProjectCheckpoint) {
  validatePassiveProject(input);
  if (!input.household) return ordinary(input,saved);
  validateHouseholdProject(input);
  const snapshot = saved ? { ...saved.household!,spawning: saved.timeline } : undefined;
  const timeline = createStartupHousehold({ ...input.household,spawning: input.project.spawning },snapshot);
  return { begin: (tick: number) => timeline.begin(tick),result: () => timeline.result(),
    finish(receipts: readonly StartupCashReceipt[]) { const result = timeline.finish(receipts); return { flows: result.flows,picked: result.withdrawn,spent: timeline.frameOutsideExpense(),ambientEnergy: timeline.frameAmbientEnergy() }; },
    checkpoint() { const wire = timeline.checkpoint(); return { timeline: wire.spawning,household: householdPart(wire) }; } };
}
function ordinary(input: StartupDeliveryInput, saved?: StartupProjectCheckpoint) {
  const timeline = createStartupSpawnTimeline(input.project.spawning,saved?.timeline);
  return { begin: (tick: number) => timeline.begin(tick),result: () => timeline.result(),
    finish(receipts: readonly StartupCashReceipt[]) { const flows = timeline.finish(receipts); return { flows,picked: 0,spent: 0,ambientEnergy: timeline.frameAmbientEnergy() }; },checkpoint: () => ({ timeline: timeline.checkpoint() }) };
}
function householdPart(wire: StartupHouseholdCheckpoint): Omit<StartupHouseholdCheckpoint,'spawning'> {
  return { format: wire.format,binding: wire.binding,through: wire.through,endpointEnergy: wire.endpointEnergy,endpointSpentEnergy: wire.endpointSpentEnergy,
    endpointReceivedEnergy: wire.endpointReceivedEnergy,redistribution: wire.redistribution,losses: wire.losses };
}
export function validateHouseholdProject(input: StartupDeliveryInput): void {
  validatePassiveProject(input);
  const household = input.household;
  if (!household) return;
  const remote = new Set([...input.project.workers,...input.couriers].map(worker => worker.request));
  if (household.redistribution.trips.some(trip => remote.has(trip.request))) throw new Error('Household and remote work share a body');
  if (household.endpointEnergy > input.homeSink.capacity-input.homeSink.freeCapacity) throw new Error('Household endpoint stock exceeds occupied sink capacity');
}

function validatePassiveProject(input: StartupDeliveryInput): void {
  if (input.project.spawning.funding.energyLayout?.regeneration && input.project.spawning.cash.flows.some(flow => flow.kind !== 'delivery' && flow.spending !== 'outside-spawn' && flow.energy > 0)) throw new Error('Unlocated passive project expense');
}
