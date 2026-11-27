import { logisticsPool } from '../../../../capabilities/logistics/request';
import { createEnergyInventoryFrame } from '../../../../capabilities/resources/energy-inventory/frame';
import { withinRange } from '../../../../capabilities/movement/path-model';
import type { PaidHomeBody, PaidHomeObservation, PaidHomeSourceObservation } from '../home-observation/model';
import type { StartupWorkerFacts } from '../facts-model';
import type { PaidUnitObservation } from '../motion-observation/model';
import type { StartupPaidWorker } from '../../../../capabilities/economy/startup/shared-model';
export interface PaidHomePhysicalInput extends Pick<PaidHomeObservation,'observedAt' | 'inventories' | 'bodies' | 'workers'> {
  endpoint: Pick<PaidHomeObservation['endpoint'],'id' | 'energy' | 'capacity' | 'freeCapacity'>;
  sources: readonly Pick<PaidHomeSourceObservation,'miners' | 'couriers'>[];
}
/** Structures and actual native bodies share one inventory; worker cargo never becomes opening bank cash. */
export function createPaidHomePhysicalInventory(home: PaidHomePhysicalInput) {
  const roster = bodyRoster(home);
  for (const source of home.sources) {
    for (const miner of source.miners) validatePaidBody(home.observedAt,miner.paid,miner.observation,roster);
    for (const courier of source.couriers) validatePaidBody(home.observedAt,courier.paid,courier.opening.observed,roster);
  }
  const stores = [...home.inventories,...home.bodies.map(body => body.inventory)];
  if (stores.some(store => ![logisticsPool('capacity',store.id),logisticsPool('capacity',store.id,'energy')].includes(store.capacityPool))) {
    throw new Error('Physical inventory capacity pool mismatch');
  }
  const bank = home.inventories.find(store => store.id === home.endpoint.id);
  if (!bank || bank.energy !== home.endpoint.energy || bank.capacity !== home.endpoint.capacity || bank.freeEnergyCapacity !== home.endpoint.freeCapacity) {
    throw new Error('Physical home bank mismatch');
  }
  return createEnergyInventoryFrame(home.observedAt,stores);
}
function bodyRoster(home: PaidHomePhysicalInput) {
  if (home.bodies.length > 128 || home.bodies.length !== home.workers.length) throw new Error('Physical home roster mismatch');
  const workers = new Map(home.workers.map(worker => [worker.name,worker]));
  const bodies = new Map(home.bodies.map(body => [body.name,body]));
  if (workers.size !== home.workers.length || bodies.size !== home.bodies.length || new Set(home.bodies.map(body => body.unit)).size !== home.bodies.length) {
    throw new Error('Duplicate physical home body');
  }
  for (const body of home.bodies) validateBody(body,workers.get(body.name));
  return { workers,bodies };
}
function validateBody(body: PaidHomeBody, worker: StartupWorkerFacts | undefined): void {
  if (!worker || !body.name || !body.unit || body.unit !== body.inventory.id) throw new Error('Physical body identity mismatch');
  if (body.inventory.room !== worker.position.room || body.inventory.energy !== worker.energy || body.inventory.usedCapacity !== worker.usedCapacity
    || body.inventory.active === worker.spawning) throw new Error('Physical body store mismatch');
}
function validatePaidBody(tick: number, paid: StartupPaidWorker, observed: PaidUnitObservation,
  roster: { workers: ReadonlyMap<string,StartupWorkerFacts>; bodies: ReadonlyMap<string,PaidHomeBody> }): void {
  const body = roster.bodies.get(paid.request), worker = roster.workers.get(paid.request);
  if (!body || !worker || body.unit !== observed.unit || observed.name !== paid.request || observed.observedAt !== tick) throw new Error('Paid physical body identity mismatch');
  validatePaidStore(paid,observed,body,worker);
}
function validatePaidStore(paid: StartupPaidWorker, observed: PaidUnitObservation, body: PaidHomeBody, worker: StartupWorkerFacts): void {
  if (body.inventory.capacity !== paid.capacity || body.inventory.energy !== observed.energy || observed.owner !== paid.owner || worker.owner !== paid.owner) {
    throw new Error('Paid physical body store mismatch');
  }
  if (!withinRange(worker.position,observed.position,0)) throw new Error('Paid physical body position mismatch');
}
