import { integer, keys, numbers, record, requireCheckpoint, time } from './validation';
import { validProjectSource } from './project-work';
import type { StartupDeliveryInput, StartupDeliveryForecast } from '../delivery-model';
import type { StartupProjectCheckpoint, StartupProjectReceipt } from './project-model';
const counters = ['deliveredEnergy','harvestedEnergy','regeneratedEnergy','unreturnedCourierEnergy','overflowEnergy','uncapturedOverflowEnergy','containerEnergy','minerCargoEnergy','courierCargoEnergy','unusedMinerCargoEnergy','projectedThrough'];
export function validateProjectDelivery(input: StartupDeliveryInput, saved: StartupProjectCheckpoint): void {
  const value: unknown = saved.delivery;
  requireCheckpoint(record(value) && keys(value,[...counters,'firstDeliveryAt','source','receipts']));
  const delivery = value as StartupDeliveryForecast;
  requireCheckpoint(numbers(value as Record<string,unknown>,counters) && validProjectSource(delivery.source,input.project.source));
  requireCheckpoint(delivery.containerEnergy <= input.containerCapacity && delivery.projectedThrough <= saved.tick);
  requireCheckpoint(Array.isArray(delivery.receipts) && delivery.receipts.length === 0);
  validateReceipts(input,saved);
}
function validateReceipts(input: StartupDeliveryInput, saved: StartupProjectCheckpoint): void {
  const horizon = input.project.spawning.cash.horizon;
  requireCheckpoint(Array.isArray(saved.due) && Array.isArray(saved.settled) && saved.due.length+saved.settled.length <= 160016);
  requireCheckpoint(saved.settled.every(receipt => validReceipt(receipt,input) && time(receipt.tick,saved.tick)));
  requireCheckpoint(saved.due.every(receipt => validReceipt(receipt,input) && integer(receipt.tick,saved.tick,horizon) && receipt.id === receiptId(receipt)));
  requireCheckpoint(saved.settled.every((receipt,index) => index === 0 || receiptOrder(saved.settled[index-1]!,receipt) <= 0));
  const receipts = [...saved.settled,...saved.due];
  requireCheckpoint(new Set(receipts.map(receiptId)).size === receipts.length);
  requireCheckpoint(saved.delivery.deliveredEnergy === receipts.reduce((sum,receipt) => sum+receipt.energy,0));
  requireCheckpoint(saved.delivery.firstDeliveryAt === receipts.reduce<number | null>((first,receipt) => Math.min(first ?? Infinity,receipt.tick),null));
}
function validReceipt(value: unknown, input: StartupDeliveryInput): value is StartupProjectReceipt {
  if (!record(value) || !integer(value.tick,0,input.project.spawning.cash.horizon) || !integer(value.energy,1,1000000)) return false;
  return input.couriers.some(worker => worker.request === value.request) || (input.initial?.couriers ?? []).some(worker => worker.id === value.request);
}
export function receiptId(receipt: { request: string; tick: number }): string { return 'remote-delivery:'+receipt.request+':'+receipt.tick; }

function receiptOrder(a: { tick: number; request: string }, b: typeof a): number { return a.tick-b.tick || a.request.localeCompare(b.request); }
