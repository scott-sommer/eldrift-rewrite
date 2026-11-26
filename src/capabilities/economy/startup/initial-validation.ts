import { partCosts } from '../../spawning/body';
import { spawnedActiveTicks } from '../../spawning/lifetime';
import { integer } from './checkpoints/validation';
import type { StartupDeliveryInput } from './delivery-model';
import type { StartupInitialCourier, StartupInitialMiner } from './initial-model';
export function validateStartupInitial(input: StartupDeliveryInput): void {
  const initial = input.initial; if (initial === undefined) return;
  if (!integer(initial.containerEnergy,0,input.containerCapacity) || !Array.isArray(initial.couriers)) throw new Error('Invalid startup opening stock');
  if (initial.containerEnergy > 0 && input.project.remainingProgress > 0) throw new Error('Opening container stock requires a completed container');
  validatePeople(input);
}
function validatePeople(input: StartupDeliveryInput): void {
  const initial = input.initial!;
  if (initial.couriers.length+input.couriers.length > 16) throw new Error('Startup initial courier capacity');
  if (initial.miner) { validateWorker(initial.miner); if (!initial.miner.body.includes('work')) throw new Error('Initial miner requires WORK'); }
  for (const worker of initial.couriers) validateCourier(worker);
  const ids = [...(initial.miner ? [initial.miner.id] : []),...initial.couriers.map(worker => worker.id),...input.project.spawning.requests.map(request => request.id)];
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate startup incumbent/future identity');
}

function validateWorker(worker: StartupInitialMiner): void {
  if (typeof worker.id !== 'string' || !worker.id || worker.id.length > 240) throw new Error('Invalid startup incumbent identity');
  if (!Array.isArray(worker.body) || !worker.body.length || worker.body.length > 50 || !worker.body.every(part => Object.hasOwn(partCosts,part))) throw new Error('Invalid startup incumbent body');
  const capacity = worker.body.filter(part => part === 'carry').length*50;
  if (!capacity || !integer(worker.energy,0,capacity)) throw new Error('Invalid startup incumbent cargo');
  validateLifetime(worker);
}
function validateLifetime(worker: StartupInitialMiner): void {
  if (!integer(worker.remainingSpawnTicks,0,worker.body.length*3) || !integer(worker.expiresAt,worker.remainingSpawnTicks+1,worker.remainingSpawnTicks+spawnedActiveTicks(worker.body))) throw new Error('Invalid startup incumbent remaining life');
  if (!integer(worker.availableAt,worker.remainingSpawnTicks,10000) || !integer(worker.retireTicks,0,1500)) throw new Error('Invalid startup incumbent timing');
  if (worker.remainingSpawnTicks > 0 && worker.energy !== 0) throw new Error('Incubating worker cannot own carried energy');
}
function validateCourier(worker: StartupInitialCourier): void {
  validateWorker(worker);
  if (worker.turnaroundTicks !== undefined && !integer(worker.turnaroundTicks,0,1500)) throw new Error('Invalid startup incumbent turnaround');
  if (!['collect','deliver'].includes(worker.phase) || !['courier','return-only'].includes(worker.mode)) throw new Error('Invalid startup incumbent phase');
  if (worker.phase === 'collect' && worker.energy !== 0) throw new Error('Collecting incumbent must have empty cargo');
  if (![worker.outboundTicks,worker.returnTicks].every(value => integer(value,0,1500))) throw new Error('Invalid startup incumbent route');
  if (![worker.collectionTicks,worker.deliveryTicks].every(value => integer(value,1,1500))) throw new Error('Invalid startup incumbent service');
  if (!integer(worker.minimumBatch,1,worker.body.filter(part => part === 'carry').length*50)) throw new Error('Invalid startup incumbent batch');
}
