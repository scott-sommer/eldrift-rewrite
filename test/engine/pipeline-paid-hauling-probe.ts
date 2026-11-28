import { seedHomeWorldControl,homeMinerDefinitions } from '../../src/app/remotes/startup/hauling-state/world/control';
import { observePaidHomeControl } from '../../src/app/remotes/startup/home-observation/control';
import { createPaidHomePhysicalInventory } from '../../src/app/remotes/startup/hauling-state/inventory';
import { createPaidHaulingForecastState } from '../../src/app/remotes/startup/hauling-state/seed';
import { haulingDefinitions } from '../../src/app/remotes/startup/hauling-state/opening';
import type { PaidHomeObservation } from '../../src/app/remotes/startup/home-observation/model';
import { taskSchema } from '../../src/persistence/tasks/schema';
import { peekState } from '../../src/persistence/versioned-state';
import { stateKey } from '../../src/persistence/state-key';
import { logisticsQueueSchema } from '../../src/features/logistics/request-schema';
import { createTransferJournal } from '../../src/features/logistics/transfer-journal';
import { createQuantityReservations } from '../../src/persistence/quantities/store';
/** Only private forecast owners can be written; the native owner port is never passed here. */
export function probePaidHaulingSeed(home: PaidHomeObservation) {
  const couriers = home.sources.flatMap(source => source.couriers.map(courier => ({ source: source.cohort.source,room: source.cohort.room,opening: courier.opening })));
  const seed = createPaidHaulingForecastState(home.home,home.observedAt,couriers,[...home.claims.owned,...home.claims.external]);
  seedHomeWorldControl(home,seed.state,false);
  const records = peekState(seed.state,stateKey('logistics-requests',home.home),logisticsQueueSchema)!.records;
  const workers = seed.workers.map(worker => {
    const task = peekState(seed.state,stateKey('tasks',worker.name),taskSchema(worker.name,haulingDefinitions))!.queue[0] ?? null;
    const request = worker.opening.observed.task?.request;
    const record = request && records.find(item => item.request.owner === request.owner && item.request.id === request.id);
    return { name: worker.name,unit: worker.unit,source: worker.source,task,
      remaining: record ? record.request.quantity-record.receipts.reduce((total,receipt) => total+receipt.amount,0) : null,
      receipts: record?.receipts ?? [],journal: createTransferJournal(seed.state,worker.unit).peek() ?? null };
  });
  const miners = home.sources.flatMap(source => source.miners.map(miner => ({ name: miner.paid.request,unit: miner.observation.unit,source: source.cohort.source,
    task: peekState(seed.state,stateKey('tasks',miner.paid.request),taskSchema(miner.paid.request,homeMinerDefinitions))!.queue[0] ?? null })));
  const inventory = createPaidHomePhysicalInventory(home);
  return { workers,miners,control: observePaidHomeControl(seed.state,home.observedAt),inventories: inventory.snapshot(),ecology: inventory.ecologySnapshot(),claims: createQuantityReservations(seed.state).list(home.observedAt) };
}
export type PaidHaulingSeedProbe = ReturnType<typeof probePaidHaulingSeed>;
