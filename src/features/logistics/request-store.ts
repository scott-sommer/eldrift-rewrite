import { openState, saveState } from '../../persistence/versioned-state';
import type { StatePort } from '../../persistence/versioned-state';
import { stateKey } from '../../persistence/state-key';
import { validateLogisticsRequest } from '../../capabilities/logistics/request';
import type { LogisticsRequest } from '../../capabilities/logistics/request';
import { delivered, logisticsQueueSchema } from './request-schema';
import type { DeliveryReceipt, LogisticsRecord } from './request-schema';
/** Completed/cancelled records remain until expiry, preventing replay from recreating their work. */
export function createLogisticsRequests(port: StatePort, room: string) {
  const key = stateKey('logistics-requests', room);
  const read = () => openState(port, key, logisticsQueueSchema);
  const save = (records: LogisticsRecord[]) => saveState(port, key, logisticsQueueSchema, { records });
  return {
    submit(request: LogisticsRequest, tick: number): void {
      validTick(tick);
      validateLogisticsRequest(request);
      if (request.expiresAt <= tick) throw new Error('Expired logistics request');
      const records = read().records.filter(record => record.request.expiresAt > tick);
      const existing = records.find(record => matches(record, request.owner, request.id));
      if (existing) {
        if (!sameRequest(existing.request, request)) throw new Error('Logistics request identity conflict');
        return;
      }
      save([...records, { request, cancelled: false, receipts: [] }]);
    },
    pending(tick: number): LogisticsRequest[] {
      validTick(tick);
      return read().records.filter(record => !record.cancelled && record.request.expiresAt > tick)
        .map(record => ({ ...record.request, quantity: record.request.quantity - delivered(record) }))
        .filter(request => request.quantity > 0)
        .sort((a, b) => a.priority - b.priority || a.owner.localeCompare(b.owner) || a.id.localeCompare(b.id));
    },
    confirm(owner: string, id: string, receipt: DeliveryReceipt, tick: number): boolean {
      validTick(tick);
      const state = read();
      const record = state.records.find(item => matches(item, owner, id));
      if (!record || record.cancelled || record.request.expiresAt <= tick) return false;
      if (!addReceipt(record, receipt)) return false;
      save(state.records);
      return true;
    },
    cancel(owner: string, id: string): boolean {
      const state = read();
      const record = state.records.find(item => matches(item, owner, id));
      if (!record || record.cancelled) return false;
      record.cancelled = true;
      save(state.records);
      return true;
    },
  };
}
function addReceipt(record: LogisticsRecord, receipt: DeliveryReceipt): boolean {
  if (typeof receipt.id !== 'string' || !receipt.id || !Number.isSafeInteger(receipt.amount) || receipt.amount < 1) throw new Error('Invalid delivery receipt');
  const existing = record.receipts.find(item => item.id === receipt.id);
  if (existing) {
    if (existing.amount !== receipt.amount) throw new Error('Delivery receipt identity conflict');
    return false;
  }
  if (delivered(record) + receipt.amount > record.request.quantity) throw new Error('Delivery exceeds outstanding request');
  record.receipts.push(receipt);
  return true;
}
function matches(record: LogisticsRecord, owner: string, id: string): boolean {
  return record.request.owner === owner && record.request.id === id;
}
function sameRequest(a: LogisticsRequest, b: LogisticsRequest): boolean {
  return (Object.keys(a) as (keyof LogisticsRequest)[]).every(key => a[key] === b[key]);
}
function validTick(tick: number): void {
  if (!Number.isSafeInteger(tick) || tick < 0) throw new Error('Invalid logistics tick');
}
