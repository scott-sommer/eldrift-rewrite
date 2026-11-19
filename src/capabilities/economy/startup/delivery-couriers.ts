import type { StartupScheduledBirth } from './spawn-model';
import type { StartupCourierState, StartupDeliveryForecast, StartupDeliveryInput, StartupCourier } from './delivery-model';
export function startupDeliveryCouriers(input: StartupDeliveryInput, births: readonly StartupScheduledBirth[]): StartupCourierState[] {
  if (input.couriers.length > 16 || new Set(input.couriers.map(worker => worker.request)).size !== input.couriers.length) throw new Error('Invalid startup couriers');
  const result: StartupCourierState[] = [];
  for (const worker of input.couriers) {
    const capacity = courierCapacity(input,worker.request);
    const { collectionTicks,deliveryTicks } = courierTiming(worker,capacity);
    const birth = births.find(birth => birth.request === worker.request);
    if (!birth) continue;
    result.push({ ...worker,collectionTicks,deliveryTicks,capacity,expiresAt: birth.activeAt+1500,stopAt: birth.activeAt+1500-worker.retireTicks,
      nextAt: birth.activeAt+worker.outboundTicks,phase: 'collect',cargo: 0 });
  }
  return result.sort((a,b) => a.request.localeCompare(b.request));
}
function courierCapacity(input: StartupDeliveryInput, id: string): number {
  const request = input.project.spawning.requests.find(request => request.id === id);
  if (!request || input.project.workers.some(worker => worker.request === id)) throw new Error('Invalid courier identity');
  if (request.body.some(part => !['carry','move'].includes(part))) throw new Error('Unsupported courier body');
  const capacity = request.body.filter(part => part === 'carry').length*50;
  if (!capacity || !request.body.includes('move')) throw new Error('Courier requires CARRY and MOVE');
  return capacity;
}
/** Effects become available next frame. Collection never borrows a later same-frame miner handoff. */
export function advanceStartupCouriers(workers: StartupCourierState[], result: StartupDeliveryForecast, tick: number, horizon: number): void {
  for (const worker of workers) {
    if (tick < worker.nextAt) continue;
    if (worker.phase === 'deliver') { deliver(worker,result,tick,horizon); continue; }
    collect(worker,result,tick);
  }
}
function collect(worker: StartupCourierState, result: StartupDeliveryForecast, tick: number): void {
  if (tick >= worker.stopAt || tick+worker.collectionTicks+worker.returnTicks+worker.deliveryTicks >= worker.expiresAt || result.containerEnergy < worker.minimumBatch) return;
  worker.cargo = Math.min(worker.capacity,result.containerEnergy); result.containerEnergy -= worker.cargo;
  worker.phase = 'deliver'; worker.nextAt = tick+worker.collectionTicks+worker.returnTicks;
}
function deliver(worker: StartupCourierState, result: StartupDeliveryForecast, tick: number, horizon: number): void {
  if (tick+worker.deliveryTicks > horizon) return;
  result.receipts.push({ tick: tick+worker.deliveryTicks,energy: worker.cargo,request: worker.request });
  result.deliveredEnergy += worker.cargo; result.firstDeliveryAt = Math.min(result.firstDeliveryAt ?? Infinity,tick+worker.deliveryTicks);
  worker.cargo = 0; worker.phase = 'collect'; worker.nextAt = tick+worker.deliveryTicks+worker.outboundTicks;
}

function courierTiming(worker: StartupCourier, capacity: number) {
  const collectionTicks = worker.collectionTicks ?? 1, deliveryTicks = worker.deliveryTicks ?? 1;
  if (![collectionTicks,deliveryTicks].every(value => Number.isSafeInteger(value) && value >= 1 && value <= 1500)) throw new Error('Invalid courier service delay');
  if (![worker.outboundTicks,worker.returnTicks,worker.retireTicks].every(value => Number.isSafeInteger(value) && value >= 0 && value <= 1500)) throw new Error('Invalid courier timing');
  if (!Number.isSafeInteger(worker.minimumBatch) || worker.minimumBatch < 1 || worker.minimumBatch > capacity) throw new Error('Invalid courier batch');
  return { collectionTicks,deliveryTicks };
}
