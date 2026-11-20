import type { StateSchema } from '../../persistence/versioned-state';
import { validateLogisticsRequest } from '../../capabilities/logistics/request';
import type { LogisticsRequest } from '../../capabilities/logistics/request';
export interface DeliveryReceipt { id: string; amount: number }
export interface LogisticsRecord { request: LogisticsRequest; cancelled: boolean; receipts: DeliveryReceipt[] }
export interface LogisticsQueue { records: LogisticsRecord[] }
export function delivered(record: LogisticsRecord): number {
  return record.receipts.reduce((total, receipt) => total + receipt.amount, 0);
}
function validRecord(value: unknown): value is LogisticsRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as LogisticsRecord;
  try { validateLogisticsRequest(record.request); } catch { return false; }
  return typeof record.cancelled === 'boolean' && validReceipts(record.receipts)
    && delivered(record) <= record.request.quantity;
}
function validReceipts(value: unknown): value is DeliveryReceipt[] {
  if (!Array.isArray(value) || value.length > 256) return false;
  return value.every(item => item && typeof item === 'object' && typeof item.id === 'string' && item.id.length > 0
    && Number.isSafeInteger(item.amount) && item.amount > 0)
    && new Set(value.map(item => item.id)).size === value.length;
}
export const logisticsQueueSchema: StateSchema<LogisticsQueue> = {
  owner: 'logistics', version: 2, initial: () => ({ records: [] }), migrations: { 1: migrateLegacy },
  valid(value: unknown): value is LogisticsQueue {
    if (!value || typeof value !== 'object' || !('records' in value)) return false;
    return Array.isArray(value.records) && value.records.length <= 200 && value.records.every(validRecord)
      && new Set(value.records.map(record => JSON.stringify([record.request.owner, record.request.id]))).size === value.records.length;
  },
};

function migrateLegacy(value: unknown): LogisticsQueue {
  if (!value || typeof value !== 'object' || !('records' in value) || !Array.isArray(value.records)) throw new Error('Invalid legacy logistics queue');
  if (!value.records.every(validRecord) || value.records.some(record => record.request.service !== undefined)) throw new Error('Invalid legacy logistics service');
  return { ...value,records: value.records };
}
