import { spawnedActiveTicks } from '../../spawning/lifetime';
import type { StartupSink } from './sink';
import type { StartupScheduledBirth } from './spawn-model';
import type { StartupCourierState, StartupDeliveryForecast, StartupDeliveryInput, StartupCourier } from './delivery-model';
export function startupDeliveryCouriers(input: StartupDeliveryInput, births: readonly StartupScheduledBirth[]): StartupCourierState[] {
  if (input.couriers.length > 16 || new Set(input.couriers.map(worker => worker.request)).size !== input.couriers.length) throw new Error('Invalid startup couriers');
  const result: StartupCourierState[] = [];
  for (const worker of input.couriers) {
    const { capacity,lifetime } = courierBody(input,worker.request);
    const { collectionTicks,deliveryTicks,initialOutboundTicks } = courierTiming(worker,capacity);
    const birth = births.find(birth => birth.request === worker.request);
    if (!birth) continue;
    result.push({ ...worker,collectionTicks,deliveryTicks,initialOutboundTicks,capacity,expiresAt: birth.activeAt+lifetime,stopAt: birth.activeAt+lifetime-worker.retireTicks,
      nextAt: birth.activeAt+initialOutboundTicks,phase: 'collect',cargo: 0 });
  }
  return result.sort((a,b) => a.request.localeCompare(b.request));
}
function courierBody(input: StartupDeliveryInput, id: string): { capacity: number; lifetime: number } {
  const request = input.project.spawning.requests.find(request => request.id === id);
  if (!request || input.project.workers.some(worker => worker.request === id)) throw new Error('Invalid courier identity');
  if (request.body.some(part => !['carry','move'].includes(part))) throw new Error('Unsupported courier body');
  const capacity = request.body.filter(part => part === 'carry').length*50;
  if (!capacity || !request.body.includes('move')) throw new Error('Courier requires CARRY and MOVE');
  return { capacity,lifetime: spawnedActiveTicks(request.body) };
}
/** Effects become available next frame. Collection never borrows a later same-frame miner handoff. */
export function advanceStartupCouriers(workers: StartupCourierState[], result: StartupDeliveryForecast, tick: number, horizon: number, sink: StartupSink): void {
  for (const worker of workers) {
    if (tick < worker.nextAt) continue;
    if (tick >= worker.expiresAt) { result.unreturnedCourierEnergy += worker.cargo; worker.cargo = 0; worker.nextAt = Infinity; continue; }
    if (worker.phase === 'deliver') { deliver(worker,result,tick,horizon,sink); continue; }
    collect(worker,result,tick);
  }
}
function collect(worker: StartupCourierState, result: StartupDeliveryForecast, tick: number): void {
  if (tick >= worker.stopAt || tick+worker.collectionTicks+worker.returnTicks+worker.deliveryTicks >= worker.expiresAt || result.containerEnergy < worker.minimumBatch) return;
  worker.cargo = Math.min(worker.capacity,result.containerEnergy); result.containerEnergy -= worker.cargo;
  worker.phase = 'deliver'; worker.nextAt = tick+worker.collectionTicks+worker.returnTicks;
}
function deliver(worker: StartupCourierState, result: StartupDeliveryForecast, tick: number, horizon: number, sink: StartupSink): void {
  if (tick+worker.deliveryTicks > horizon || tick+worker.deliveryTicks >= worker.expiresAt) return;
  const amount = sink.take(worker.cargo);
  if (amount === 0) return;
  result.receipts.push({ tick: tick+worker.deliveryTicks,energy: amount,request: worker.request });
  result.deliveredEnergy += amount; result.firstDeliveryAt = Math.min(result.firstDeliveryAt ?? Infinity,tick+worker.deliveryTicks);
  worker.cargo -= amount; worker.nextAt = tick+worker.deliveryTicks;
  if (worker.cargo === 0) { worker.phase = 'collect'; worker.nextAt += worker.outboundTicks; }
}

function courierTiming(worker: StartupCourier, capacity: number) {
  const service = courierServiceTiming(worker), initialOutboundTicks = worker.initialOutboundTicks ?? worker.outboundTicks;
  if (![initialOutboundTicks,worker.outboundTicks,worker.returnTicks,worker.retireTicks].every(value => Number.isSafeInteger(value) && value >= 0 && value <= 1500)) throw new Error('Invalid courier timing');
  if (!Number.isSafeInteger(worker.minimumBatch) || worker.minimumBatch < 1 || worker.minimumBatch > capacity) throw new Error('Invalid courier batch');
  return { ...service,initialOutboundTicks };
}
function courierServiceTiming(worker: StartupCourier) {
  const collectionTicks = worker.collectionTicks ?? 1, deliveryTicks = worker.deliveryTicks ?? 1;
  if (![collectionTicks,deliveryTicks].every(value => Number.isSafeInteger(value) && value >= 1 && value <= 1500)) throw new Error('Invalid courier service delay');
  return { collectionTicks,deliveryTicks };
}
